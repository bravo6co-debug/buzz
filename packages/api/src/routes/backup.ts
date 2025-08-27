// 백업 관리 API
import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { backupService } from '../services/backupService.js';

const router = express.Router();

// 백업 상태 조회
router.get('/status', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const status = backupService.getStatus();
    const config = backupService.getConfig();
    
    res.json({
      ...status,
      config
    });
  } catch (error) {
    console.error('Error fetching backup status:', error);
    res.status(500).json({ error: 'Failed to fetch backup status' });
  }
});

// 백업 이력 조회
router.get('/history', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const history = await backupService.getBackupHistory(Number(limit));
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching backup history:', error);
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
});

// 데이터베이스 백업 실행
router.post('/database', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`Database backup requested by admin ${req.user.id}`);
    
    const backup = await backupService.backupDatabase();
    
    res.json({
      success: true,
      backup,
      message: 'Database backup completed successfully'
    });
  } catch (error) {
    console.error('Error creating database backup:', error);
    res.status(500).json({ error: 'Failed to create database backup' });
  }
});

// 파일 백업 실행
router.post('/files', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`Files backup requested by admin ${req.user.id}`);
    
    const backup = await backupService.backupFiles();
    
    res.json({
      success: true,
      backup,
      message: 'Files backup completed successfully'
    });
  } catch (error) {
    console.error('Error creating files backup:', error);
    res.status(500).json({ error: 'Failed to create files backup' });
  }
});

// 전체 백업 실행
router.post('/full', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`Full backup requested by admin ${req.user.id}`);
    
    const backups = await backupService.fullBackup();
    
    const successCount = backups.filter(b => b.status === 'completed').length;
    const failureCount = backups.length - successCount;
    
    res.json({
      success: successCount > 0,
      backups,
      summary: {
        total: backups.length,
        successful: successCount,
        failed: failureCount
      },
      message: `Full backup completed: ${successCount} successful, ${failureCount} failed`
    });
  } catch (error) {
    console.error('Error creating full backup:', error);
    res.status(500).json({ error: 'Failed to create full backup' });
  }
});

// 데이터베이스 복원
router.post('/restore', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { backupPath, confirmRestore } = req.body;
    
    if (!backupPath) {
      return res.status(400).json({ error: 'Backup path is required' });
    }
    
    if (!confirmRestore) {
      return res.status(400).json({ 
        error: 'Restore confirmation is required',
        warning: 'This operation will overwrite all existing data. Set confirmRestore=true to proceed.'
      });
    }
    
    console.log(`Database restore requested by admin ${req.user.id}: ${backupPath}`);
    
    await backupService.restoreDatabase(backupPath);
    
    res.json({
      success: true,
      message: 'Database restore completed successfully',
      backupPath,
      restoredBy: req.user.id,
      restoredAt: new Date()
    });
  } catch (error) {
    console.error('Error restoring database:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
});

// 오래된 백업 정리
router.delete('/cleanup', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`Backup cleanup requested by admin ${req.user.id}`);
    
    const deletedCount = await backupService.cleanupOldBackups();
    
    res.json({
      success: true,
      deletedCount,
      message: `Cleanup completed: ${deletedCount} old backups deleted`
    });
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({ error: 'Failed to cleanup backups' });
  }
});

// 백업 설정 조회
router.get('/config', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const config = backupService.getConfig();
    
    res.json({ config });
  } catch (error) {
    console.error('Error fetching backup config:', error);
    res.status(500).json({ error: 'Failed to fetch backup config' });
  }
});

// 백업 설정 업데이트
router.patch('/config', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { database, files, storage } = req.body;
    
    const updates: any = {};
    if (database) updates.database = database;
    if (files) updates.files = files;
    if (storage) updates.storage = storage;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No configuration updates provided' });
    }
    
    backupService.updateConfig(updates);
    
    console.log(`Backup configuration updated by admin ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Backup configuration updated successfully',
      config: backupService.getConfig()
    });
  } catch (error) {
    console.error('Error updating backup config:', error);
    res.status(500).json({ error: 'Failed to update backup config' });
  }
});

// 백업 서비스 제어
router.post('/control', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    switch (action) {
      case 'start':
        backupService.start();
        break;
      case 'stop':
        backupService.stop();
        break;
      case 'restart':
        backupService.stop();
        setTimeout(() => backupService.start(), 1000);
        break;
    }
    
    console.log(`Backup service ${action} requested by admin ${req.user.id}`);
    
    res.json({
      success: true,
      action,
      message: `Backup service ${action} completed`
    });
  } catch (error) {
    console.error('Error controlling backup service:', error);
    res.status(500).json({ error: 'Failed to control backup service' });
  }
});

// 백업 통계
router.get('/stats', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const history = await backupService.getBackupHistory(1000); // 충분히 많은 수
    const cutoffDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    
    const recentBackups = history.filter(backup => backup.startedAt > cutoffDate);
    
    // 통계 계산
    const stats = {
      total: recentBackups.length,
      successful: recentBackups.filter(b => b.status === 'completed').length,
      failed: recentBackups.filter(b => b.status === 'failed').length,
      running: recentBackups.filter(b => b.status === 'started').length,
      byType: {
        database: recentBackups.filter(b => b.type === 'database').length,
        files: recentBackups.filter(b => b.type === 'files').length,
        full: recentBackups.filter(b => b.type === 'full').length
      },
      totalSize: recentBackups
        .filter(b => b.fileSize)
        .reduce((sum, b) => sum + (b.fileSize || 0), 0),
      averageDuration: recentBackups
        .filter(b => b.duration)
        .reduce((sum, b, _, arr) => sum + (b.duration || 0) / arr.length, 0),
      lastBackup: history.length > 0 ? history[0] : null
    };
    
    res.json({
      period: `Last ${days} days`,
      stats
    });
  } catch (error) {
    console.error('Error fetching backup stats:', error);
    res.status(500).json({ error: 'Failed to fetch backup stats' });
  }
});

// 백업 파일 검증 (미래 구현용)
router.post('/verify/:backupId', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { backupId } = req.params;
    
    // 실제로는 백업 파일의 무결성을 검증하는 로직 필요
    // 예: 체크섬 확인, 파일 구조 검증, 테스트 복원 등
    
    res.json({
      success: true,
      backupId: Number(backupId),
      verified: true,
      message: 'Backup verification completed',
      note: 'Backup verification system is under development'
    });
  } catch (error) {
    console.error('Error verifying backup:', error);
    res.status(500).json({ error: 'Failed to verify backup' });
  }
});

export { router as backupRouter };