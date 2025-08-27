// 실시간 모니터링 API
import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { monitoringService } from '../services/monitoringService.js';

const router = express.Router();

// 시스템 상태 조회
router.get('/health', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const health = await monitoringService.getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// 최근 알림 조회
router.get('/alerts', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50, type, source, resolved } = req.query;
    
    let alerts = monitoringService.getRecentAlerts(Number(limit));
    
    // 필터링
    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }
    
    if (source) {
      alerts = alerts.filter(a => a.source === source);
    }
    
    if (resolved !== undefined) {
      const isResolved = resolved === 'true';
      alerts = alerts.filter(a => a.resolved === isResolved);
    }
    
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// 메트릭 조회
router.get('/metrics', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { type, minutes = 60 } = req.query;
    
    const metrics = monitoringService.getMetrics(
      type as string, 
      Number(minutes)
    );
    
    // 데이터 포인트 집계 (차트용)
    const aggregated = aggregateMetrics(metrics, Number(minutes));
    
    res.json({
      raw: metrics,
      aggregated,
      timeRange: {
        from: new Date(Date.now() - Number(minutes) * 60 * 1000),
        to: new Date(),
        intervalMinutes: Number(minutes)
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// 실시간 대시보드 데이터
router.get('/dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const health = await monitoringService.getSystemHealth();
    const recentAlerts = monitoringService.getRecentAlerts(10);
    const metrics = monitoringService.getMetrics(undefined, 30); // 최근 30분
    
    // 주요 지표 계산
    const responseTimeMetrics = metrics.filter(m => m.type === 'api_response_time');
    const memoryMetrics = metrics.filter(m => m.type === 'memory_usage');
    const errorRateMetrics = metrics.filter(m => m.type === 'api_error_rate');
    
    const avgResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;
      
    const currentMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1].value
      : 0;
      
    const currentErrorRate = errorRateMetrics.length > 0
      ? errorRateMetrics[errorRateMetrics.length - 1].value
      : 0;
    
    // 알림 통계
    const alertStats = {
      total: recentAlerts.length,
      critical: recentAlerts.filter(a => a.type === 'error' && !a.resolved).length,
      warnings: recentAlerts.filter(a => a.type === 'warning' && !a.resolved).length,
      resolved: recentAlerts.filter(a => a.resolved).length
    };
    
    res.json({
      systemHealth: health,
      keyMetrics: {
        responseTime: Math.round(avgResponseTime),
        memoryUsage: Math.round(currentMemoryUsage),
        errorRate: Math.round(currentErrorRate * 100) / 100,
        uptime: process.uptime()
      },
      alerts: {
        recent: recentAlerts.slice(0, 5), // 최근 5개만
        stats: alertStats
      },
      trends: {
        responseTime: aggregateMetrics(responseTimeMetrics, 30),
        memoryUsage: aggregateMetrics(memoryMetrics, 30),
        errorRate: aggregateMetrics(errorRateMetrics, 30)
      },
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// 알림 해결
router.patch('/alerts/:alertId/resolve', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { alertId } = req.params;
    const { notes } = req.body;
    
    const resolved = monitoringService.resolveAlert(alertId);
    
    if (!resolved) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    console.log(`Alert ${alertId} resolved by admin ${req.user.id}${notes ? ': ' + notes : ''}`);
    
    res.json({ 
      success: true, 
      alertId,
      resolvedBy: req.user.id,
      resolvedAt: new Date()
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// 수동 알림 생성 (테스트용)
router.post('/alerts', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { type, source, message, details } = req.body;
    
    if (!['error', 'warning', 'info'].includes(type)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }
    
    if (!['database', 'api', 'settlement', 'user', 'business'].includes(source)) {
      return res.status(400).json({ error: 'Invalid alert source' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    monitoringService.createAlert({
      type,
      source,
      message,
      details
    });
    
    console.log(`Manual alert created by admin ${req.user.id}: ${message}`);
    
    res.json({ success: true, message: 'Alert created successfully' });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// 시스템 통계 (관리자용)
router.get('/stats', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { period = 'hour' } = req.query;
    
    let minutes;
    switch (period) {
      case 'hour': minutes = 60; break;
      case 'day': minutes = 24 * 60; break;
      case 'week': minutes = 7 * 24 * 60; break;
      default: minutes = 60;
    }
    
    const metrics = monitoringService.getMetrics(undefined, minutes);
    const alerts = monitoringService.getRecentAlerts(1000)
      .filter(a => a.timestamp > new Date(Date.now() - minutes * 60 * 1000));
    
    // 메트릭 유형별 통계
    const metricTypes = [...new Set(metrics.map(m => m.type))];
    const metricStats = metricTypes.map(type => {
      const typeMetrics = metrics.filter(m => m.type === type);
      return {
        type,
        count: typeMetrics.length,
        average: typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length,
        min: Math.min(...typeMetrics.map(m => m.value)),
        max: Math.max(...typeMetrics.map(m => m.value)),
        latest: typeMetrics[typeMetrics.length - 1]?.value || 0
      };
    });
    
    // 알림 통계
    const alertTypeStats = {
      error: alerts.filter(a => a.type === 'error').length,
      warning: alerts.filter(a => a.type === 'warning').length,
      info: alerts.filter(a => a.type === 'info').length
    };
    
    const alertSourceStats = {
      database: alerts.filter(a => a.source === 'database').length,
      api: alerts.filter(a => a.source === 'api').length,
      settlement: alerts.filter(a => a.source === 'settlement').length,
      user: alerts.filter(a => a.source === 'user').length,
      business: alerts.filter(a => a.source === 'business').length
    };
    
    res.json({
      period,
      timeRange: {
        from: new Date(Date.now() - minutes * 60 * 1000),
        to: new Date()
      },
      metrics: {
        total: metrics.length,
        types: metricStats
      },
      alerts: {
        total: alerts.length,
        byType: alertTypeStats,
        bySource: alertSourceStats,
        resolved: alerts.filter(a => a.resolved).length
      }
    });
  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 모니터링 서비스 제어
router.post('/control', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    switch (action) {
      case 'start':
        monitoringService.start();
        break;
      case 'stop':
        monitoringService.stop();
        break;
      case 'restart':
        monitoringService.stop();
        setTimeout(() => monitoringService.start(), 1000);
        break;
    }
    
    console.log(`Monitoring service ${action} requested by admin ${req.user.id}`);
    
    res.json({ 
      success: true, 
      action,
      message: `Monitoring service ${action} completed`
    });
  } catch (error) {
    console.error('Error controlling monitoring service:', error);
    res.status(500).json({ error: 'Failed to control monitoring service' });
  }
});

// 유틸리티 함수: 메트릭 집계
function aggregateMetrics(metrics: any[], minutes: number) {
  if (metrics.length === 0) return [];
  
  const intervals = Math.min(20, minutes); // 최대 20개 구간
  const intervalSize = (minutes * 60 * 1000) / intervals;
  const now = Date.now();
  
  const aggregated = [];
  
  for (let i = 0; i < intervals; i++) {
    const intervalStart = new Date(now - (intervals - i) * intervalSize);
    const intervalEnd = new Date(now - (intervals - i - 1) * intervalSize);
    
    const intervalMetrics = metrics.filter(m => 
      m.timestamp >= intervalStart && m.timestamp < intervalEnd
    );
    
    if (intervalMetrics.length > 0) {
      const average = intervalMetrics.reduce((sum, m) => sum + m.value, 0) / intervalMetrics.length;
      aggregated.push({
        timestamp: intervalStart,
        value: Math.round(average * 100) / 100,
        count: intervalMetrics.length
      });
    } else {
      aggregated.push({
        timestamp: intervalStart,
        value: 0,
        count: 0
      });
    }
  }
  
  return aggregated;
}

export { router as monitoringRouter };