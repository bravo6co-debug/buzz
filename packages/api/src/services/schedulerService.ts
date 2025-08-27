// 자동 스케줄링 및 리포트 생성 서비스
import cron from 'node-cron';
import { settlementBatchService } from './settlementBatch.js';
import { reportGenerator } from './reportGenerator.js';
import { analyticsService } from './analyticsService.js';
import { monitoringService } from './monitoringService.js';
import { db } from '@buzz/database';
import { 
  businessSettlements, 
  businesses,
  users,
  systemMetrics 
} from '@buzz/database/schema';
import { eq, gte, lte, desc } from 'drizzle-orm';

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastError?: string;
}

export interface AutoReportConfig {
  type: 'daily' | 'weekly' | 'monthly';
  format: 'excel' | 'pdf' | 'both';
  recipients: string[];
  enabled: boolean;
  schedule: string;
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  constructor() {
    this.setupDefaultTasks();
  }

  // 스케줄러 시작
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('⏰ Starting scheduler service...');
    
    // 기본 태스크들 시작
    this.startAllTasks();
    
    // 모니터링 시작
    monitoringService.start();
    
    console.log('✅ Scheduler service started successfully');
  }

  // 스케줄러 중지
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('🛑 Stopping scheduler service...');
    
    // 모든 크론 작업 중지
    this.cronJobs.forEach(job => job.stop());
    
    // 모니터링 중지
    monitoringService.stop();
    
    console.log('✅ Scheduler service stopped');
  }

  // 태스크 추가
  addTask(task: Omit<ScheduledTask, 'status' | 'lastRun' | 'nextRun'>, handler: () => Promise<void>): void {
    const fullTask: ScheduledTask = {
      ...task,
      status: 'idle'
    };

    this.tasks.set(task.id, fullTask);

    if (task.enabled) {
      this.scheduleTask(task.id, task.schedule, handler);
    }

    console.log(`Task added: ${task.name} (${task.schedule})`);
  }

  // 태스크 제거
  removeTask(taskId: string): boolean {
    const cronJob = this.cronJobs.get(taskId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(taskId);
    }

    return this.tasks.delete(taskId);
  }

  // 태스크 활성화/비활성화
  toggleTask(taskId: string, enabled: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;

    if (enabled && !this.cronJobs.has(taskId)) {
      // 태스크 핸들러를 다시 찾아서 스케줄링 (실제로는 핸들러 저장이 필요)
      console.log(`Task ${taskId} enabled but handler not found`);
    } else if (!enabled && this.cronJobs.has(taskId)) {
      const cronJob = this.cronJobs.get(taskId);
      cronJob?.stop();
      this.cronJobs.delete(taskId);
    }

    return true;
  }

  // 태스크 목록 조회
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  // 태스크 수동 실행
  async runTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'running';
    task.lastRun = new Date();

    try {
      // 실제 태스크 실행은 저장된 핸들러를 사용해야 함
      // 여기서는 기본 태스크들만 직접 실행
      await this.executeTask(taskId);
      
      task.status = 'success';
      task.lastError = undefined;
      return true;
    } catch (error) {
      task.status = 'failed';
      task.lastError = error.message;
      console.error(`Task ${taskId} failed:`, error);
      return false;
    }
  }

  // 자동 리포트 설정
  configureAutoReports(configs: AutoReportConfig[]): void {
    // 기존 리포트 태스크들 제거
    const reportTasks = Array.from(this.tasks.keys()).filter(id => id.startsWith('auto-report-'));
    reportTasks.forEach(taskId => this.removeTask(taskId));

    // 새 리포트 태스크들 추가
    configs.forEach(config => {
      if (config.enabled) {
        this.addAutoReportTask(config);
      }
    });
  }

  // 기본 태스크 설정
  private setupDefaultTasks(): void {
    // 일일 정산 (매일 자정)
    this.addTask({
      id: 'daily-settlement',
      name: 'Daily Settlement Batch',
      schedule: '0 0 * * *',
      enabled: true
    }, async () => {
      await settlementBatchService.runDailySettlement();
    });

    // 주간 정산 (매주 월요일 오전 6시)
    this.addTask({
      id: 'weekly-settlement',
      name: 'Weekly Settlement Batch',
      schedule: '0 6 * * 1',
      enabled: true
    }, async () => {
      await settlementBatchService.runWeeklySettlement();
    });

    // 월간 정산 (매월 1일 오전 6시)
    this.addTask({
      id: 'monthly-settlement',
      name: 'Monthly Settlement Batch',
      schedule: '0 6 1 * *',
      enabled: true
    }, async () => {
      await settlementBatchService.runMonthlySettlement();
    });

    // 일일 통계 리포트 (매일 오전 9시)
    this.addTask({
      id: 'daily-stats-report',
      name: 'Daily Statistics Report',
      schedule: '0 9 * * *',
      enabled: true
    }, async () => {
      await this.generateDailyStatsReport();
    });

    // 주간 종합 리포트 (매주 월요일 오전 10시)
    this.addTask({
      id: 'weekly-summary-report',
      name: 'Weekly Summary Report',
      schedule: '0 10 * * 1',
      enabled: true
    }, async () => {
      await this.generateWeeklySummaryReport();
    });

    // 월간 종합 리포트 (매월 1일 오전 10시)
    this.addTask({
      id: 'monthly-summary-report',
      name: 'Monthly Summary Report',
      schedule: '0 10 1 * *',
      enabled: true
    }, async () => {
      await this.generateMonthlySummaryReport();
    });

    // 시스템 메트릭 정리 (매일 오전 3시)
    this.addTask({
      id: 'cleanup-metrics',
      name: 'Cleanup Old Metrics',
      schedule: '0 3 * * *',
      enabled: true
    }, async () => {
      await this.cleanupOldMetrics();
    });

    // 리포트 파일 정리 (매주 일요일 오전 4시)
    this.addTask({
      id: 'cleanup-reports',
      name: 'Cleanup Old Reports',
      schedule: '0 4 * * 0',
      enabled: true
    }, async () => {
      await reportGenerator.cleanupOldReports();
    });

    // 건강상태 체크 (매 5분)
    this.addTask({
      id: 'health-check',
      name: 'System Health Check',
      schedule: '*/5 * * * *',
      enabled: true
    }, async () => {
      await this.performHealthCheck();
    });
  }

  // 모든 태스크 시작
  private startAllTasks(): void {
    this.tasks.forEach((task, taskId) => {
      if (task.enabled) {
        const handler = this.getTaskHandler(taskId);
        if (handler) {
          this.scheduleTask(taskId, task.schedule, handler);
        }
      }
    });
  }

  // 태스크 스케줄링
  private scheduleTask(taskId: string, schedule: string, handler: () => Promise<void>): void {
    const cronJob = cron.schedule(schedule, async () => {
      const task = this.tasks.get(taskId);
      if (!task || !task.enabled) return;

      console.log(`🔄 Executing scheduled task: ${task.name}`);
      
      task.status = 'running';
      task.lastRun = new Date();

      try {
        await handler();
        task.status = 'success';
        task.lastError = undefined;
        console.log(`✅ Task completed: ${task.name}`);
      } catch (error) {
        task.status = 'failed';
        task.lastError = error.message;
        console.error(`❌ Task failed: ${task.name}`, error);
        
        // 모니터링 알림 생성
        monitoringService.createAlert({
          type: 'error',
          source: 'api',
          message: `Scheduled task failed: ${task.name}`,
          details: { taskId, error: error.message }
        });
      }
    }, { scheduled: false });

    cronJob.start();
    this.cronJobs.set(taskId, cronJob);

    // 다음 실행 시간 계산 (단순화)
    const task = this.tasks.get(taskId);
    if (task) {
      task.nextRun = this.calculateNextRun(schedule);
    }
  }

  // 태스크 핸들러 조회
  private getTaskHandler(taskId: string): (() => Promise<void>) | null {
    const handlers = {
      'daily-settlement': () => settlementBatchService.runDailySettlement(),
      'weekly-settlement': () => settlementBatchService.runWeeklySettlement(),
      'monthly-settlement': () => settlementBatchService.runMonthlySettlement(),
      'daily-stats-report': () => this.generateDailyStatsReport(),
      'weekly-summary-report': () => this.generateWeeklySummaryReport(),
      'monthly-summary-report': () => this.generateMonthlySummaryReport(),
      'cleanup-metrics': () => this.cleanupOldMetrics(),
      'cleanup-reports': () => reportGenerator.cleanupOldReports(),
      'health-check': () => this.performHealthCheck()
    };

    return handlers[taskId] || null;
  }

  // 태스크 실행
  private async executeTask(taskId: string): Promise<void> {
    const handler = this.getTaskHandler(taskId);
    if (!handler) {
      throw new Error(`No handler found for task: ${taskId}`);
    }
    await handler();
  }

  // 자동 리포트 태스크 추가
  private addAutoReportTask(config: AutoReportConfig): void {
    const taskId = `auto-report-${config.type}`;
    
    this.addTask({
      id: taskId,
      name: `Auto ${config.type} Report`,
      schedule: config.schedule,
      enabled: config.enabled
    }, async () => {
      await this.generateAutoReport(config);
    });
  }

  // 자동 리포트 생성
  private async generateAutoReport(config: AutoReportConfig): Promise<void> {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    // 지난 기간의 리포트 생성
    if (config.type === 'monthly') {
      month = month === 1 ? 12 : month - 1;
      if (month === 12) year--;
    }

    const fileName = await reportGenerator.generateMonthlyReport(year, month, config.format);
    
    // 실제로는 이메일 발송 등의 로직 추가 필요
    console.log(`📧 Auto report generated: ${fileName} for ${config.recipients.join(', ')}`);
  }

  // 일일 통계 리포트
  private async generateDailyStatsReport(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const metrics = await analyticsService.getDashboardMetrics(yesterday, yesterday);
    
    console.log(`📊 Daily stats: ${metrics.overview.totalUsers} users, ${metrics.overview.totalRevenue} revenue`);
  }

  // 주간 요약 리포트
  private async generateWeeklySummaryReport(): Promise<void> {
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekEnd = new Date();
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    const metrics = await analyticsService.getDashboardMetrics(lastWeekStart, lastWeekEnd);
    
    console.log(`📈 Weekly summary: ${metrics.trends.weeklyRevenue.length} weeks analyzed`);
  }

  // 월간 종합 리포트
  private async generateMonthlySummaryReport(): Promise<void> {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    const fileName = await reportGenerator.generateMonthlyReport(year, lastMonth + 1);
    
    console.log(`📋 Monthly summary report generated: ${fileName}`);
  }

  // 오래된 메트릭 정리
  private async cleanupOldMetrics(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // 30일 이전 메트릭 삭제 (실제로는 더 정교한 로직 필요)
      const result = await db.delete(systemMetrics)
        .where(lte(systemMetrics.recordedAt, thirtyDaysAgo));
      
      console.log(`🧹 Cleaned up old metrics older than 30 days`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
      throw error;
    }
  }

  // 헬스체크 수행
  private async performHealthCheck(): Promise<void> {
    try {
      const health = await monitoringService.getSystemHealth();
      
      // 메트릭 기록
      await monitoringService.recordMetric({
        type: 'system_health_check',
        value: health.database.status === 'healthy' ? 1 : 0,
        unit: 'status'
      });

      // 심각한 문제가 있는 경우 알림 생성
      if (health.database.status === 'critical' || health.api.status === 'critical') {
        monitoringService.createAlert({
          type: 'error',
          source: 'api',
          message: 'Critical system health detected',
          details: health
        });
      }
    } catch (error) {
      console.error('Health check failed:', error);
      
      monitoringService.createAlert({
        type: 'error',
        source: 'api',
        message: 'Health check failed',
        details: { error: error.message }
      });
    }
  }

  // 다음 실행 시간 계산 (단순화된 버전)
  private calculateNextRun(schedule: string): Date {
    // 실제로는 cron 표현식을 파싱해서 계산해야 함
    // 여기서는 대략적인 추정만
    const now = new Date();
    
    if (schedule.includes('* * *')) {
      // 매일
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (schedule.includes('* * 1')) {
      // 매주 월요일
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
      return nextMonday;
    } else if (schedule.includes('1 * *')) {
      // 매월 1일
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth;
    }
    
    // 기본값: 1시간 후
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    return nextHour;
  }
}

// 싱글톤 인스턴스
export const schedulerService = new SchedulerService();