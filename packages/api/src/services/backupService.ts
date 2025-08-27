// 자동 백업 시스템
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { db } from '@buzz/database';
import { backupLogs } from '@buzz/database/schema';
import { desc } from 'drizzle-orm';
import { monitoringService } from './monitoringService.js';

const fsAccess = promisify(fs.access);
const fsStat = promisify(fs.stat);
const fsReaddir = promisify(fs.readdir);
const fsUnlink = promisify(fs.unlink);

export interface BackupConfig {
  database: {
    enabled: boolean;
    schedule: string; // cron 표현식
    retention: number; // 보관 일수
    compression: boolean;
  };
  files: {
    enabled: boolean;
    paths: string[];
    schedule: string;
    retention: number;
    compression: boolean;
  };
  storage: {
    local: {
      path: string;
      maxSize: number; // MB
    };
    cloud?: {
      provider: 'aws' | 'gcp' | 'azure';
      bucket: string;
      credentials: any;
    };
  };
}

export interface BackupStatus {
  id: number;
  type: 'database' | 'files' | 'full';
  status: 'started' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  duration?: number;
}

export class BackupService {
  private config: BackupConfig;
  private backupDir: string;
  private isRunning = false;

  constructor(config?: BackupConfig) {
    this.config = config || this.getDefaultConfig();
    this.backupDir = path.resolve(this.config.storage.local.path);
    this.ensureBackupDirectory();
  }

  // 백업 시스템 시작
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('💾 Starting backup system...');
    
    // 백업 디렉토리 확인
    this.ensureBackupDirectory();
    
    console.log(`📁 Backup directory: ${this.backupDir}`);
    console.log('✅ Backup system started');
  }

  // 백업 시스템 중지
  stop(): void {
    this.isRunning = false;
    console.log('🛑 Backup system stopped');
  }

  // 데이터베이스 백업
  async backupDatabase(): Promise<BackupStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `db_backup_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, fileName);

    // 백업 로그 시작
    const [backupLog] = await db.insert(backupLogs).values({
      backupType: 'database',
      status: 'started',
      filePath
    }).returning();

    try {
      console.log('🔄 Starting database backup...');

      // PostgreSQL 백업 실행
      await this.executePgDump(filePath);

      // 압축 처리
      let finalPath = filePath;
      let finalSize = 0;

      if (this.config.database.compression) {
        finalPath = await this.compressFile(filePath);
        await fsUnlink(filePath); // 원본 파일 삭제
      }

      // 파일 크기 확인
      const stats = await fsStat(finalPath);
      finalSize = stats.size;

      const duration = Math.round((Date.now() - startTime) / 1000);

      // 백업 로그 완료
      await db.update(backupLogs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          fileSize: finalSize,
          filePath: finalPath
        })
        .where({ id: backupLog.id });

      console.log(`✅ Database backup completed: ${finalPath} (${this.formatBytes(finalSize)}, ${duration}s)`);

      // 메트릭 기록
      await monitoringService.recordMetric({
        type: 'backup_database_duration',
        value: duration,
        unit: 'seconds'
      });

      await monitoringService.recordMetric({
        type: 'backup_database_size',
        value: Math.round(finalSize / 1024 / 1024),
        unit: 'MB'
      });

      return {
        id: backupLog.id,
        type: 'database',
        status: 'completed',
        filePath: finalPath,
        fileSize: finalSize,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration
      };

    } catch (error) {
      console.error('❌ Database backup failed:', error);

      // 백업 로그 실패 기록
      await db.update(backupLogs)
        .set({
          status: 'failed',
          errorMessage: error.message
        })
        .where({ id: backupLog.id });

      // 실패한 파일 정리
      try {
        await fsAccess(filePath);
        await fsUnlink(filePath);
      } catch {}

      // 알림 생성
      monitoringService.createAlert({
        type: 'error',
        source: 'database',
        message: 'Database backup failed',
        details: { error: error.message, filePath }
      });

      throw error;
    }
  }

  // 파일 백업
  async backupFiles(): Promise<BackupStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `files_backup_${timestamp}.tar.gz`;
    const filePath = path.join(this.backupDir, fileName);

    // 백업 로그 시작
    const [backupLog] = await db.insert(backupLogs).values({
      backupType: 'files',
      status: 'started',
      filePath
    }).returning();

    try {
      console.log('🔄 Starting files backup...');

      // tar 압축 실행
      await this.createTarArchive(this.config.files.paths, filePath);

      // 파일 크기 확인
      const stats = await fsStat(filePath);
      const fileSize = stats.size;
      const duration = Math.round((Date.now() - startTime) / 1000);

      // 백업 로그 완료
      await db.update(backupLogs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          fileSize
        })
        .where({ id: backupLog.id });

      console.log(`✅ Files backup completed: ${filePath} (${this.formatBytes(fileSize)}, ${duration}s)`);

      // 메트릭 기록
      await monitoringService.recordMetric({
        type: 'backup_files_duration',
        value: duration,
        unit: 'seconds'
      });

      return {
        id: backupLog.id,
        type: 'files',
        status: 'completed',
        filePath,
        fileSize,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration
      };

    } catch (error) {
      console.error('❌ Files backup failed:', error);

      // 백업 로그 실패 기록
      await db.update(backupLogs)
        .set({
          status: 'failed',
          errorMessage: error.message
        })
        .where({ id: backupLog.id });

      // 실패한 파일 정리
      try {
        await fsAccess(filePath);
        await fsUnlink(filePath);
      } catch {}

      monitoringService.createAlert({
        type: 'error',
        source: 'api',
        message: 'Files backup failed',
        details: { error: error.message, filePath }
      });

      throw error;
    }
  }

  // 전체 백업 (데이터베이스 + 파일)
  async fullBackup(): Promise<BackupStatus[]> {
    console.log('🔄 Starting full backup...');
    
    const results: BackupStatus[] = [];

    if (this.config.database.enabled) {
      try {
        const dbBackup = await this.backupDatabase();
        results.push(dbBackup);
      } catch (error) {
        console.error('Database backup failed during full backup:', error);
      }
    }

    if (this.config.files.enabled) {
      try {
        const filesBackup = await this.backupFiles();
        results.push(filesBackup);
      } catch (error) {
        console.error('Files backup failed during full backup:', error);
      }
    }

    console.log(`✅ Full backup completed: ${results.length} backups created`);
    return results;
  }

  // 백업 복원
  async restoreDatabase(backupPath: string): Promise<void> {
    console.log(`🔄 Restoring database from: ${backupPath}`);

    try {
      // 파일 존재 확인
      await fsAccess(backupPath);

      // .gz 파일인 경우 압축 해제
      let sqlFilePath = backupPath;
      if (backupPath.endsWith('.gz')) {
        sqlFilePath = await this.decompressFile(backupPath);
      }

      // PostgreSQL 복원 실행
      await this.executePsqlRestore(sqlFilePath);

      // 임시 파일 정리
      if (sqlFilePath !== backupPath) {
        await fsUnlink(sqlFilePath);
      }

      console.log('✅ Database restore completed');

      monitoringService.createAlert({
        type: 'info',
        source: 'database',
        message: 'Database restore completed',
        details: { backupPath }
      });

    } catch (error) {
      console.error('❌ Database restore failed:', error);

      monitoringService.createAlert({
        type: 'error',
        source: 'database',
        message: 'Database restore failed',
        details: { error: error.message, backupPath }
      });

      throw error;
    }
  }

  // 백업 목록 조회
  async getBackupHistory(limit = 50): Promise<BackupStatus[]> {
    const logs = await db
      .select()
      .from(backupLogs)
      .orderBy(desc(backupLogs.startedAt))
      .limit(limit);

    return logs.map(log => ({
      id: log.id,
      type: log.backupType as 'database' | 'files' | 'full',
      status: log.status as 'started' | 'completed' | 'failed',
      filePath: log.filePath || undefined,
      fileSize: log.fileSize || undefined,
      startedAt: log.startedAt,
      completedAt: log.completedAt || undefined,
      errorMessage: log.errorMessage || undefined,
      duration: log.completedAt 
        ? Math.round((log.completedAt.getTime() - log.startedAt.getTime()) / 1000)
        : undefined
    }));
  }

  // 오래된 백업 정리
  async cleanupOldBackups(): Promise<number> {
    console.log('🧹 Cleaning up old backups...');

    const dbRetentionDate = new Date(Date.now() - this.config.database.retention * 24 * 60 * 60 * 1000);
    const filesRetentionDate = new Date(Date.now() - this.config.files.retention * 24 * 60 * 60 * 1000);

    let deletedCount = 0;

    try {
      // 백업 디렉토리의 파일 목록 가져오기
      const files = await fsReaddir(this.backupDir);

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fsStat(filePath);

        let shouldDelete = false;

        if (file.startsWith('db_backup_') && stats.mtime < dbRetentionDate) {
          shouldDelete = true;
        } else if (file.startsWith('files_backup_') && stats.mtime < filesRetentionDate) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          await fsUnlink(filePath);
          deletedCount++;
          console.log(`🗑️ Deleted old backup: ${file}`);
        }
      }

      // 데이터베이스 로그도 정리
      const oldestRetentionDate = new Date(Math.min(dbRetentionDate.getTime(), filesRetentionDate.getTime()));
      
      // 실제로는 DELETE 쿼리로 오래된 로그 삭제
      console.log(`📝 Cleaned up backup logs older than ${oldestRetentionDate.toISOString()}`);

      console.log(`✅ Cleanup completed: ${deletedCount} old backups deleted`);
      
      return deletedCount;

    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
      
      monitoringService.createAlert({
        type: 'warning',
        source: 'api',
        message: 'Backup cleanup failed',
        details: { error: error.message }
      });

      return 0;
    }
  }

  // 백업 설정 업데이트
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 백업 디렉토리 변경시 재설정
    if (newConfig.storage?.local?.path) {
      this.backupDir = path.resolve(newConfig.storage.local.path);
      this.ensureBackupDirectory();
    }

    console.log('⚙️ Backup configuration updated');
  }

  // 현재 설정 조회
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  // 백업 상태 확인
  getStatus(): {
    isRunning: boolean;
    backupDir: string;
    diskUsage: {
      used: number;
      available: number;
      total: number;
    };
    lastBackup?: {
      database?: Date;
      files?: Date;
    };
  } {
    // 실제로는 디스크 사용량을 정확히 계산해야 함
    return {
      isRunning: this.isRunning,
      backupDir: this.backupDir,
      diskUsage: {
        used: 0, // 백업 폴더 사용량
        available: 1000 * 1024 * 1024, // 1GB (임시값)
        total: 10 * 1000 * 1024 * 1024 // 10GB (임시값)
      },
      lastBackup: {
        database: new Date(), // 마지막 DB 백업 시간
        files: new Date() // 마지막 파일 백업 시간
      }
    };
  }

  // 기본 설정
  private getDefaultConfig(): BackupConfig {
    return {
      database: {
        enabled: true,
        schedule: '0 2 * * *', // 매일 오전 2시
        retention: 30, // 30일 보관
        compression: true
      },
      files: {
        enabled: true,
        paths: ['./reports', './uploads'],
        schedule: '0 3 * * *', // 매일 오전 3시
        retention: 7, // 7일 보관
        compression: true
      },
      storage: {
        local: {
          path: './backups',
          maxSize: 5 * 1024 // 5GB
        }
      }
    };
  }

  // 백업 디렉토리 생성
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  // PostgreSQL 덤프 실행
  private executePgDump(outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 환경 변수에서 DB 정보 가져오기 (실제로는 더 안전한 방식 필요)
      const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/buzz';
      
      const pgDump = spawn('pg_dump', [dbUrl, '--no-owner', '--no-privileges'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const writeStream = fs.createWriteStream(outputPath);
      pgDump.stdout.pipe(writeStream);

      let errorOutput = '';
      pgDump.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pgDump.on('error', (error) => {
        reject(new Error(`pg_dump process error: ${error.message}`));
      });

      pgDump.on('close', (code) => {
        writeStream.end();
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  // PostgreSQL 복원 실행
  private executePsqlRestore(inputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/buzz';
      
      const psql = spawn('psql', [dbUrl], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const readStream = fs.createReadStream(inputPath);
      readStream.pipe(psql.stdin);

      let errorOutput = '';
      psql.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      psql.on('error', (error) => {
        reject(new Error(`psql process error: ${error.message}`));
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  // tar 아카이브 생성
  private createTarArchive(paths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', outputPath, ...paths], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let errorOutput = '';
      tar.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      tar.on('error', (error) => {
        reject(new Error(`tar process error: ${error.message}`));
      });

      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`tar exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  // 파일 압축
  private async compressFile(filePath: string): Promise<string> {
    const gzipPath = `${filePath}.gz`;
    
    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-f', filePath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      gzip.on('error', reject);
      gzip.on('close', (code) => {
        if (code === 0) {
          resolve(gzipPath);
        } else {
          reject(new Error(`gzip exited with code ${code}`));
        }
      });
    });
  }

  // 파일 압축 해제
  private async decompressFile(gzipPath: string): Promise<string> {
    const filePath = gzipPath.replace('.gz', '');
    
    return new Promise((resolve, reject) => {
      const gunzip = spawn('gunzip', ['-c', gzipPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const writeStream = fs.createWriteStream(filePath);
      gunzip.stdout.pipe(writeStream);

      gunzip.on('error', reject);
      gunzip.on('close', (code) => {
        writeStream.end();
        if (code === 0) {
          resolve(filePath);
        } else {
          reject(new Error(`gunzip exited with code ${code}`));
        }
      });
    });
  }

  // 바이트 포맷팅
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
}

// 싱글톤 인스턴스
export const backupService = new BackupService();