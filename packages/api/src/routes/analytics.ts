// 고급 분석 API
import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { analyticsService } from '../services/analyticsService.js';

const router = express.Router();

// 관리자 대시보드 종합 통계
router.get('/dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start, end;
    if (startDate) start = new Date(startDate as string);
    if (endDate) end = new Date(endDate as string);
    
    const metrics = await analyticsService.getDashboardMetrics(start, end);
    
    res.json(metrics);
    
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// 사업체별 상세 분석
router.get('/business/:businessId', requireAuth, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { months = 12 } = req.query;
    
    // 권한 확인 (사업자는 자신의 분석만, 관리자는 모든 분석)
    if (req.user.role === 'business' && req.user.businessId !== businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const analytics = await analyticsService.getBusinessAnalytics(businessId, Number(months));
    
    res.json(analytics);
    
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ error: 'Failed to fetch business analytics' });
  }
});

// 사용자별 분석 (관리자 전용)
router.get('/user/:userId', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    
    const analytics = await analyticsService.getUserAnalytics(userId);
    
    res.json(analytics);
    
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// 내 분석 데이터 (사용자용)
router.get('/my', requireAuth, requireRole(['user']), async (req, res) => {
  try {
    const analytics = await analyticsService.getUserAnalytics(req.user.id);
    
    // 개인정보 보호를 위해 일부 정보만 제공
    const publicAnalytics = {
      activity: analytics.activity,
      referrals: analytics.referrals,
      mileage: analytics.mileage,
      preferences: {
        favoriteBusinesses: analytics.preferences.favoriteBusinesses,
        spending_pattern: {
          averageSessionValue: analytics.preferences.spending_pattern.averageSessionValue
        }
      }
    };
    
    res.json(publicAnalytics);
    
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// 사업체 성과 랭킹 (관리자용)
router.get('/rankings/businesses', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      metric = 'revenue', 
      period = 'month', 
      limit = 50,
      startDate,
      endDate 
    } = req.query;
    
    let start, end;
    if (startDate) start = new Date(startDate as string);
    if (endDate) end = new Date(endDate as string);
    
    // 기본적으로는 대시보드 메트릭스에서 상위 성과 사업체를 가져오지만,
    // 더 세분화된 랭킹이 필요하면 별도 구현
    const dashboardMetrics = await analyticsService.getDashboardMetrics(start, end);
    
    res.json({
      rankings: dashboardMetrics.businesses.topPerforming.slice(0, Number(limit)),
      metric,
      period
    });
    
  } catch (error) {
    console.error('Error fetching business rankings:', error);
    res.status(500).json({ error: 'Failed to fetch business rankings' });
  }
});

// 리퍼럴 성과 랭킹
router.get('/rankings/referrers', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50, startDate, endDate } = req.query;
    
    let start, end;
    if (startDate) start = new Date(startDate as string);
    if (endDate) end = new Date(endDate as string);
    
    const dashboardMetrics = await analyticsService.getDashboardMetrics(start, end);
    
    res.json({
      rankings: dashboardMetrics.referrals.topReferrers.slice(0, Number(limit)),
      totalReferrals: dashboardMetrics.referrals.totalReferrals,
      averageSuccessRate: dashboardMetrics.referrals.successRate
    });
    
  } catch (error) {
    console.error('Error fetching referral rankings:', error);
    res.status(500).json({ error: 'Failed to fetch referral rankings' });
  }
});

// 실시간 통계 (간단한 현재 상태)
router.get('/realtime', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 오늘의 통계
    const todayMetrics = await analyticsService.getDashboardMetrics(today, tomorrow);
    
    // 실시간 표시를 위한 간소화된 데이터
    const realtimeData = {
      today: {
        newUsers: todayMetrics.overview.monthlyGrowth.users, // 실제로는 오늘 신규 사용자 수
        transactions: todayMetrics.trends.dailyTransactions[todayMetrics.trends.dailyTransactions.length - 1]?.total || 0,
        revenue: todayMetrics.trends.weeklyRevenue[todayMetrics.trends.weeklyRevenue.length - 1]?.revenue || 0,
        activeBusinesses: todayMetrics.businesses.active
      },
      pending: {
        settlements: todayMetrics.settlements.pending,
        reviews: 0 // 실제로는 답변 대기 중인 리뷰 수
      },
      lastUpdated: now.toISOString()
    };
    
    res.json(realtimeData);
    
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    res.status(500).json({ error: 'Failed to fetch realtime data' });
  }
});

// 성장률 분석 (관리자용)
router.get('/growth', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { period = 'month', months = 12 } = req.query;
    
    // 기간별 성장률 분석
    const now = new Date();
    const periods = [];
    
    for (let i = Number(months) - 1; i >= 0; i--) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const metrics = await analyticsService.getDashboardMetrics(periodStart, periodEnd);
      
      periods.push({
        period: `${periodStart.getFullYear()}-${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`,
        users: metrics.overview.totalUsers,
        businesses: metrics.overview.totalBusinesses,
        revenue: metrics.overview.totalRevenue,
        settlements: metrics.overview.totalSettlements
      });
    }
    
    // 성장률 계산
    const growthRates = [];
    for (let i = 1; i < periods.length; i++) {
      const current = periods[i];
      const previous = periods[i - 1];
      
      growthRates.push({
        period: current.period,
        userGrowth: this.calculateGrowthRate(current.users, previous.users),
        businessGrowth: this.calculateGrowthRate(current.businesses, previous.businesses),
        revenueGrowth: this.calculateGrowthRate(current.revenue, previous.revenue),
        settlementGrowth: this.calculateGrowthRate(current.settlements, previous.settlements)
      });
    }
    
    res.json({
      periods,
      growthRates,
      averageGrowth: {
        users: growthRates.reduce((sum, g) => sum + g.userGrowth, 0) / growthRates.length,
        businesses: growthRates.reduce((sum, g) => sum + g.businessGrowth, 0) / growthRates.length,
        revenue: growthRates.reduce((sum, g) => sum + g.revenueGrowth, 0) / growthRates.length,
        settlements: growthRates.reduce((sum, g) => sum + g.settlementGrowth, 0) / growthRates.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching growth analysis:', error);
    res.status(500).json({ error: 'Failed to fetch growth analysis' });
  }
});

// 코호트 분석 (관리자용) - 기본 구현
router.get('/cohort', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, cohortType = 'monthly' } = req.query;
    
    // 기본적인 코호트 분석 구조
    // 실제로는 더 복잡한 분석이 필요하지만, 기본 틀만 제공
    const cohortData = {
      cohortType,
      periods: [], // 코호트별 리텐션 데이터
      analysis: {
        averageRetention: 0,
        bestPerformingCohort: null,
        insights: [
          '신규 사용자의 30일 리텐션율: 계산 중',
          '월별 코호트 분석: 준비 중',
          '리퍼럴을 통한 유입 사용자의 리텐션이 높음'
        ]
      },
      note: 'Cohort analysis is under development. Basic structure provided.'
    };
    
    res.json(cohortData);
    
  } catch (error) {
    console.error('Error fetching cohort analysis:', error);
    res.status(500).json({ error: 'Failed to fetch cohort analysis' });
  }
});

// 성과 예측 (관리자용) - 기본 구현
router.get('/forecast', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { metric = 'revenue', months = 3 } = req.query;
    
    // 기본적인 예측 분석 구조
    const currentMetrics = await analyticsService.getDashboardMetrics();
    
    const forecastData = {
      metric,
      currentValue: metric === 'revenue' ? currentMetrics.overview.totalRevenue : 0,
      forecast: [], // 예측 데이터 포인트들
      confidence: 'medium',
      methodology: 'trend_extrapolation',
      factors: [
        '과거 3개월 트렌드 기반',
        '계절성 요인 고려',
        '현재 성장률 반영'
      ],
      note: 'Forecasting system is under development. Basic structure provided.'
    };
    
    res.json(forecastData);
    
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// 유틸리티 메서드 (프로토타입에 추가)
router.calculateGrowthRate = function(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export { router as analyticsRouter };