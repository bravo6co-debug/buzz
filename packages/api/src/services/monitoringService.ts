// 실시간 모니터링 서비스
import { db } from '@buzz/database';
import { systemMetrics } from '@buzz/database/schema';
import { EventEmitter } from 'events';

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  source: 'database' | 'api' | 'settlement' | 'user' | 'business';
  message: string;
  details?: any;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceMetric {
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, any>;
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    connectionCount: number;
    queryTime: number;
    lastError?: string;
  };
  api: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    errorRate: number;
    activeRequests: number;
  };
  settlements: {
    status: 'healthy' | 'warning' | 'critical';
    pendingCount: number;
    failedBatches: number;
    lastBatchTime?: Date;
  };
  users: {
    activeUsers: number;
    newRegistrations: number;
    loginFailures: number;
  };
  businesses: {
    activeBusinesses: number;
    transactionVolume: number;
    averageResponseTime: number;
  };
}

export class MonitoringService extends EventEmitter {
  private alerts: SystemAlert[] = [];
  private metrics: PerformanceMetric[] = [];
  private healthChecks: Map<string, Date> = new Map();
  private isMonitoring = false;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  // 모니터링 시작
  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Starting real-time monitoring system...');
    
    // 정기적인 헬스체크 시작
    this.startHealthChecks();
    
    // 메트릭 수집 시작
    this.startMetricsCollection();
    
    // 알림 시스템 초기화
    this.initializeAlerts();
  }

  // 모니터링 중지
  stop(): void {
    this.isMonitoring = false;
    console.log('🛑 Stopping monitoring system...');
  }

  // 메트릭 기록
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const fullMetric = {
      ...metric,
      timestamp: new Date()
    };

    // 메모리에 저장 (최근 1000개만 유지)
    this.metrics.push(fullMetric);
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // 데이터베이스에 저장
    try {
      await db.insert(systemMetrics).values({
        metricType: metric.type,
        metricValue: metric.value.toString(),
        metricUnit: metric.unit,
        tags: metric.tags ? JSON.stringify(metric.tags) : null
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
    }

    // 임계값 확인 및 알림 생성
    this.checkMetricThresholds(fullMetric);
  }

  // 알림 생성
  createAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const fullAlert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alert
    };

    this.alerts.push(fullAlert);
    
    // 최근 100개 알림만 메모리에 유지
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    console.log(`🚨 Alert created: [${alert.type.toUpperCase()}] ${alert.source}: ${alert.message}`);
    
    // 이벤트 발생
    this.emit('alert', fullAlert);

    // 심각한 오류의 경우 즉시 알림
    if (alert.type === 'error') {
      this.emit('critical', fullAlert);
    }
  }

  // 시스템 상태 확인
  async getSystemHealth(): Promise<SystemHealth> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // 데이터베이스 상태
    const dbHealth = await this.checkDatabaseHealth();
    
    // API 상태 (최근 메트릭 기반)
    const apiMetrics = this.metrics
      .filter(m => m.type === 'api_response_time' && m.timestamp > fiveMinutesAgo);
    
    const avgResponseTime = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;

    const errorMetrics = this.metrics
      .filter(m => m.type === 'api_error_rate' && m.timestamp > fiveMinutesAgo);
    
    const avgErrorRate = errorMetrics.length > 0
      ? errorMetrics.reduce((sum, m) => sum + m.value, 0) / errorMetrics.length
      : 0;

    // 정산 시스템 상태
    const settlementHealth = await this.checkSettlementHealth();

    // 사용자 활동
    const userActivity = await this.getUserActivity();

    // 사업체 활동
    const businessActivity = await this.getBusinessActivity();

    return {
      database: dbHealth,
      api: {
        status: this.determineApiStatus(avgResponseTime, avgErrorRate),
        responseTime: Math.round(avgResponseTime),
        errorRate: Math.round(avgErrorRate * 100) / 100,
        activeRequests: this.getActiveRequestCount()
      },
      settlements: settlementHealth,
      users: userActivity,
      businesses: businessActivity
    };
  }

  // 최근 알림 조회
  getRecentAlerts(limit = 50): SystemAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // 메트릭 조회
  getMetrics(type?: string, minutes = 60): PerformanceMetric[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    return this.metrics
      .filter(m => m.timestamp > since && (!type || m.type === type))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // 알림 해결 처리
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  // 시스템 리소스 모니터링
  async monitorSystemResources(): Promise<void> {
    // 메모리 사용량
    const memUsage = process.memoryUsage();
    await this.recordMetric({
      type: 'memory_usage',
      value: memUsage.heapUsed / 1024 / 1024, // MB
      unit: 'MB'
    });

    // CPU 사용량 (간접적으로 측정)
    const startTime = process.hrtime();
    setTimeout(() => {
      const endTime = process.hrtime(startTime);
      const cpuTime = (endTime[0] * 1000 + endTime[1] / 1000000);
      this.recordMetric({
        type: 'cpu_time',
        value: cpuTime,
        unit: 'ms'
      });
    }, 100);
  }

  // 이벤트 핸들러 설정
  private setupEventHandlers(): void {
    this.on('alert', (alert: SystemAlert) => {
      // 알림 처리 로직
      this.handleAlert(alert);
    });

    this.on('critical', (alert: SystemAlert) => {
      // 심각한 알림 처리
      this.handleCriticalAlert(alert);
    });
  }

  // 헬스체크 시작
  private startHealthChecks(): void {
    // 1분마다 헬스체크 실행
    setInterval(() => {
      if (this.isMonitoring) {
        this.runHealthChecks();
      }
    }, 60 * 1000);

    // 즉시 첫 번째 헬스체크 실행
    this.runHealthChecks();
  }

  // 메트릭 수집 시작
  private startMetricsCollection(): void {
    // 10초마다 시스템 리소스 모니터링
    setInterval(() => {
      if (this.isMonitoring) {
        this.monitorSystemResources();
      }
    }, 10 * 1000);
  }

  // 알림 시스템 초기화
  private initializeAlerts(): void {
    console.log('🔔 Alert system initialized');
  }

  // 헬스체크 실행
  private async runHealthChecks(): Promise<void> {
    try {
      const health = await this.getSystemHealth();
      
      // 상태에 따른 알림 생성
      if (health.database.status === 'critical') {
        this.createAlert({
          type: 'error',
          source: 'database',
          message: 'Database connection is critical',
          details: health.database
        });
      }

      if (health.api.errorRate > 5) {
        this.createAlert({
          type: 'warning',
          source: 'api',
          message: `High API error rate: ${health.api.errorRate}%`,
          details: health.api
        });
      }

      if (health.settlements.status === 'warning') {
        this.createAlert({
          type: 'warning',
          source: 'settlement',
          message: 'Settlement system requires attention',
          details: health.settlements
        });
      }

      this.healthChecks.set('last_check', new Date());
      
    } catch (error) {
      this.createAlert({
        type: 'error',
        source: 'api',
        message: 'Health check failed',
        details: { error: error.message }
      });
    }
  }

  // 데이터베이스 상태 확인
  private async checkDatabaseHealth(): Promise<SystemHealth['database']> {
    try {
      const startTime = Date.now();
      await db.select().from(systemMetrics).limit(1);
      const queryTime = Date.now() - startTime;

      return {
        status: queryTime < 1000 ? 'healthy' : queryTime < 3000 ? 'warning' : 'critical',
        connectionCount: 1, // 실제로는 연결 풀에서 가져와야 함
        queryTime,
        lastError: undefined
      };
    } catch (error) {
      return {
        status: 'critical',
        connectionCount: 0,
        queryTime: -1,
        lastError: error.message
      };
    }
  }

  // 정산 시스템 상태 확인
  private async checkSettlementHealth(): Promise<SystemHealth['settlements']> {
    try {
      // 대기 중인 정산 수 조회 (실제로는 businessSettlements 테이블 쿼리 필요)
      const pendingCount = 0; // 임시값
      const failedBatches = 0; // 임시값

      return {
        status: pendingCount > 100 ? 'warning' : 'healthy',
        pendingCount,
        failedBatches,
        lastBatchTime: new Date()
      };
    } catch (error) {
      return {
        status: 'critical',
        pendingCount: -1,
        failedBatches: -1
      };
    }
  }

  // 사용자 활동 조회
  private async getUserActivity(): Promise<SystemHealth['users']> {
    // 실제로는 users, mileageTransactions 등 테이블 쿼리 필요
    return {
      activeUsers: 0, // 최근 1시간 내 활동 사용자 수
      newRegistrations: 0, // 오늘 신규 가입자 수
      loginFailures: 0 // 최근 1시간 내 로그인 실패 수
    };
  }

  // 사업체 활동 조회
  private async getBusinessActivity(): Promise<SystemHealth['businesses']> {
    // 실제로는 businesses, businessSettlements 등 테이블 쿼리 필요
    return {
      activeBusinesses: 0, // 활성 사업체 수
      transactionVolume: 0, // 오늘 거래량
      averageResponseTime: 0 // 평균 응답 시간
    };
  }

  // API 상태 결정
  private determineApiStatus(responseTime: number, errorRate: number): 'healthy' | 'warning' | 'critical' {
    if (errorRate > 10 || responseTime > 5000) return 'critical';
    if (errorRate > 5 || responseTime > 2000) return 'warning';
    return 'healthy';
  }

  // 활성 요청 수 (간단한 구현)
  private getActiveRequestCount(): number {
    // 실제로는 미들웨어에서 추적해야 함
    return 0;
  }

  // 메트릭 임계값 확인
  private checkMetricThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      api_response_time: { warning: 2000, critical: 5000 },
      memory_usage: { warning: 500, critical: 800 },
      cpu_usage: { warning: 80, critical: 95 },
      error_rate: { warning: 5, critical: 10 }
    };

    const threshold = thresholds[metric.type as keyof typeof thresholds];
    if (!threshold) return;

    if (metric.value > threshold.critical) {
      this.createAlert({
        type: 'error',
        source: 'api',
        message: `Critical threshold exceeded for ${metric.type}: ${metric.value}${metric.unit}`,
        details: { metric, threshold: threshold.critical }
      });
    } else if (metric.value > threshold.warning) {
      this.createAlert({
        type: 'warning',
        source: 'api',
        message: `Warning threshold exceeded for ${metric.type}: ${metric.value}${metric.unit}`,
        details: { metric, threshold: threshold.warning }
      });
    }
  }

  // 일반 알림 처리
  private handleAlert(alert: SystemAlert): void {
    // 로그 기록
    console.log(`Alert handled: ${alert.id}`);
    
    // 필요시 외부 알림 서비스 연동
    // 예: Slack, 이메일, SMS 등
  }

  // 심각한 알림 처리
  private handleCriticalAlert(alert: SystemAlert): void {
    console.error(`Critical alert: ${alert.message}`);
    
    // 즉시 알림 필요한 경우 처리
    // 예: 관리자에게 즉시 알림, 자동 복구 시도 등
  }
}

// 싱글톤 인스턴스
export const monitoringService = new MonitoringService();