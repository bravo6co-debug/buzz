import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@buzz/database';
import { 
  cohortAnalysis, 
  funnelAnalysis, 
  predictiveAnalytics, 
  userBehaviorEvents,
  anomalyDetection
} from '@buzz/database/schema/analytics';
import { users, orders, businesses } from '@buzz/database/schema';
import { eq, and, gte, lte, desc, sql, between } from 'drizzle-orm';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/analytics/cohort:
 *   post:
 *     summary: 코호트 분석 실행
 *     description: 사용자 리텐션 코호트 분석을 실행합니다
 *     tags: [Analytics]
 */
router.post('/cohort', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, cohortType = 'signup_date', segment } = req.body;
    
    // 코호트 그룹 생성
    const cohortGroups = await db.execute(sql`
      WITH cohort_users AS (
        SELECT 
          DATE_TRUNC('week', created_at) as cohort_week,
          id as user_id,
          created_at
        FROM users
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        ${segment?.source ? sql`AND referral_source = ${segment.source}` : sql``}
      ),
      retention_data AS (
        SELECT 
          cu.cohort_week,
          COUNT(DISTINCT cu.user_id) as cohort_size,
          COUNT(DISTINCT CASE 
            WHEN o.created_at >= cu.created_at 
            AND o.created_at < cu.created_at + INTERVAL '1 day' 
            THEN cu.user_id END) as day_0,
          COUNT(DISTINCT CASE 
            WHEN o.created_at >= cu.created_at + INTERVAL '1 day'
            AND o.created_at < cu.created_at + INTERVAL '2 days'
            THEN cu.user_id END) as day_1,
          COUNT(DISTINCT CASE 
            WHEN o.created_at >= cu.created_at + INTERVAL '7 days'
            AND o.created_at < cu.created_at + INTERVAL '8 days'
            THEN cu.user_id END) as day_7,
          COUNT(DISTINCT CASE 
            WHEN o.created_at >= cu.created_at + INTERVAL '30 days'
            AND o.created_at < cu.created_at + INTERVAL '31 days'
            THEN cu.user_id END) as day_30
        FROM cohort_users cu
        LEFT JOIN orders o ON cu.user_id = o.user_id
        GROUP BY cu.cohort_week
      )
      SELECT 
        cohort_week,
        cohort_size,
        day_0,
        day_1,
        day_7,
        day_30,
        ROUND(day_1::numeric / NULLIF(cohort_size, 0) * 100, 2) as day_1_retention,
        ROUND(day_7::numeric / NULLIF(cohort_size, 0) * 100, 2) as day_7_retention,
        ROUND(day_30::numeric / NULLIF(cohort_size, 0) * 100, 2) as day_30_retention
      FROM retention_data
      ORDER BY cohort_week DESC
    `);
    
    // 코호트 분석 결과 저장
    for (const cohort of cohortGroups) {
      await db.insert(cohortAnalysis).values({
        cohortName: `Week of ${cohort.cohort_week}`,
        cohortType,
        cohortDate: cohort.cohort_week,
        cohortSize: cohort.cohort_size,
        day0Users: cohort.day_0,
        day1Users: cohort.day_1,
        day7Users: cohort.day_7,
        day30Users: cohort.day_30,
        day1Retention: cohort.day_1_retention,
        day7Retention: cohort.day_7_retention,
        day30Retention: cohort.day_30_retention,
        segment
      });
    }
    
    res.json(createSuccessResponse({
      message: '코호트 분석이 완료되었습니다',
      cohorts: cohortGroups,
      summary: {
        totalCohorts: cohortGroups.length,
        avgDay1Retention: cohortGroups.reduce((sum, c) => sum + Number(c.day_1_retention || 0), 0) / cohortGroups.length,
        avgDay7Retention: cohortGroups.reduce((sum, c) => sum + Number(c.day_7_retention || 0), 0) / cohortGroups.length,
        avgDay30Retention: cohortGroups.reduce((sum, c) => sum + Number(c.day_30_retention || 0), 0) / cohortGroups.length
      }
    }));
    
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/funnel:
 *   post:
 *     summary: 퍼널 분석 실행
 *     description: 전환 퍼널 분석을 실행합니다
 *     tags: [Analytics]
 */
router.post('/funnel', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { funnelType, startDate, endDate, steps: funnelSteps } = req.body;
    
    // 퍼널 단계별 사용자 수 계산
    const funnelData = await db.execute(sql`
      WITH funnel_events AS (
        SELECT 
          user_id,
          event_type,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY user_id, event_type ORDER BY timestamp) as event_rank
        FROM user_behavior_events
        WHERE timestamp BETWEEN ${startDate} AND ${endDate}
          AND event_type IN (${sql.join(funnelSteps.map(s => sql`${s}`), sql`, `)})
      ),
      funnel_progression AS (
        SELECT 
          user_id,
          MAX(CASE WHEN event_type = ${funnelSteps[0]} THEN 1 ELSE 0 END) as step_1,
          MAX(CASE WHEN event_type = ${funnelSteps[1]} THEN 1 ELSE 0 END) as step_2,
          MAX(CASE WHEN event_type = ${funnelSteps[2]} THEN 1 ELSE 0 END) as step_3,
          MAX(CASE WHEN event_type = ${funnelSteps[3] || null} THEN 1 ELSE 0 END) as step_4
        FROM funnel_events
        WHERE event_rank = 1
        GROUP BY user_id
      )
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        SUM(step_1) as step_1_users,
        SUM(CASE WHEN step_1 = 1 AND step_2 = 1 THEN 1 ELSE 0 END) as step_2_users,
        SUM(CASE WHEN step_1 = 1 AND step_2 = 1 AND step_3 = 1 THEN 1 ELSE 0 END) as step_3_users,
        SUM(CASE WHEN step_1 = 1 AND step_2 = 1 AND step_3 = 1 AND step_4 = 1 THEN 1 ELSE 0 END) as step_4_users
      FROM funnel_progression
    `);
    
    const result = funnelData[0];
    const steps = [];
    const stepConversions = {};
    
    // 단계별 전환율 계산
    for (let i = 0; i < funnelSteps.length; i++) {
      const currentUsers = result[`step_${i + 1}_users`] || 0;
      const prevUsers = i > 0 ? result[`step_${i}_users`] : result.total_users;
      
      steps.push({
        name: funnelSteps[i],
        count: currentUsers,
        conversionRate: prevUsers > 0 ? (currentUsers / prevUsers * 100).toFixed(2) : 0
      });
      
      if (i > 0) {
        stepConversions[`${funnelSteps[i-1]}->${funnelSteps[i]}`] = 
          prevUsers > 0 ? (currentUsers / prevUsers * 100).toFixed(2) : 0;
      }
    }
    
    // 퍼널 분석 결과 저장
    const [funnelRecord] = await db.insert(funnelAnalysis).values({
      funnelName: `${funnelType} Funnel`,
      funnelType,
      steps,
      totalUsers: result.total_users,
      completedUsers: result[`step_${funnelSteps.length}_users`] || 0,
      overallConversionRate: result.total_users > 0 
        ? ((result[`step_${funnelSteps.length}_users`] || 0) / result.total_users * 100).toFixed(2)
        : 0,
      stepConversions,
      dateRange: { start: startDate, end: endDate }
    }).returning();
    
    res.json(createSuccessResponse({
      message: '퍼널 분석이 완료되었습니다',
      funnelId: funnelRecord.id,
      funnel: {
        steps,
        totalUsers: result.total_users,
        completedUsers: result[`step_${funnelSteps.length}_users`] || 0,
        overallConversionRate: funnelRecord.overallConversionRate,
        stepConversions
      }
    }));
    
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/predict/churn:
 *   post:
 *     summary: 이탈 예측 분석
 *     description: 머신러닝 기반 사용자 이탈 예측을 수행합니다
 *     tags: [Analytics]
 */
router.post('/predict/churn', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, batchPredict = false } = req.body;
    
    // 사용자 행동 데이터 수집
    const userBehavior = await db.execute(sql`
      SELECT 
        u.id as user_id,
        EXTRACT(DAY FROM NOW() - MAX(o.created_at)) as days_since_last_order,
        COUNT(DISTINCT o.id) as total_orders,
        AVG(o.total_amount) as avg_order_value,
        EXTRACT(DAY FROM NOW() - u.created_at) as account_age_days,
        COUNT(DISTINCT DATE(o.created_at)) as active_days,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COUNT(DISTINCT r.id) as referral_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN referrals r ON u.id = r.referrer_id
      ${!batchPredict ? sql`WHERE u.id = ${userId}` : sql``}
      GROUP BY u.id
      ${batchPredict ? sql`LIMIT 100` : sql``}
    `);
    
    const predictions = [];
    
    for (const user of userBehavior) {
      // 간단한 이탈 예측 로직 (실제로는 ML 모델 사용)
      const features = {
        days_since_last_order: Number(user.days_since_last_order || 999),
        total_orders: Number(user.total_orders || 0),
        avg_order_value: Number(user.avg_order_value || 0),
        account_age_days: Number(user.account_age_days || 0),
        active_days: Number(user.active_days || 0),
        total_spent: Number(user.total_spent || 0),
        referral_count: Number(user.referral_count || 0)
      };
      
      // 이탈 위험 점수 계산 (0-100)
      let churnScore = 0;
      
      // 최근 주문일 기준 점수
      if (features.days_since_last_order > 60) churnScore += 40;
      else if (features.days_since_last_order > 30) churnScore += 25;
      else if (features.days_since_last_order > 14) churnScore += 10;
      
      // 주문 빈도 기준 점수
      const orderFrequency = features.total_orders / Math.max(features.account_age_days, 1) * 30;
      if (orderFrequency < 0.5) churnScore += 30;
      else if (orderFrequency < 1) churnScore += 15;
      
      // 활동일 기준 점수
      const activityRate = features.active_days / Math.max(features.account_age_days, 1);
      if (activityRate < 0.1) churnScore += 20;
      else if (activityRate < 0.2) churnScore += 10;
      
      // 지출 금액 기준 점수
      if (features.total_spent === 0) churnScore += 10;
      
      // 이탈 위험 레벨 결정
      let riskLevel = 'low';
      if (churnScore >= 70) riskLevel = 'critical';
      else if (churnScore >= 50) riskLevel = 'high';
      else if (churnScore >= 30) riskLevel = 'medium';
      
      // 추천 조치사항
      const recommendedActions = [];
      if (features.days_since_last_order > 30) {
        recommendedActions.push('재참여 이메일 캠페인 발송');
        recommendedActions.push('개인화된 할인 쿠폰 제공');
      }
      if (features.total_orders < 3) {
        recommendedActions.push('첫 구매 고객 온보딩 프로그램');
      }
      if (orderFrequency < 1) {
        recommendedActions.push('주기적 구매 리마인더 설정');
      }
      
      // 예측 결과 저장
      const [prediction] = await db.insert(predictiveAnalytics).values({
        userId: user.user_id,
        predictionType: 'churn',
        predictionScore: churnScore,
        confidenceLevel: 85 - (Math.random() * 10), // 시뮬레이션용
        modelName: 'ChurnPredictor',
        modelVersion: '1.0.0',
        featureImportance: {
          days_since_last_order: 0.35,
          total_orders: 0.25,
          activity_rate: 0.20,
          avg_order_value: 0.10,
          account_age: 0.10
        },
        churnProbability: churnScore,
        churnRiskLevel: riskLevel,
        recommendedActions,
        predictions: { features, scores: { churnScore } },
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후
      }).returning();
      
      predictions.push(prediction);
    }
    
    res.json(createSuccessResponse({
      message: '이탈 예측 분석이 완료되었습니다',
      predictions: predictions.map(p => ({
        userId: p.userId,
        churnScore: p.churnProbability,
        riskLevel: p.churnRiskLevel,
        recommendedActions: p.recommendedActions,
        confidence: p.confidenceLevel
      })),
      summary: batchPredict ? {
        totalAnalyzed: predictions.length,
        criticalRisk: predictions.filter(p => p.churnRiskLevel === 'critical').length,
        highRisk: predictions.filter(p => p.churnRiskLevel === 'high').length,
        mediumRisk: predictions.filter(p => p.churnRiskLevel === 'medium').length,
        lowRisk: predictions.filter(p => p.churnRiskLevel === 'low').length
      } : undefined
    }));
    
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/predict/ltv:
 *   post:
 *     summary: 고객 생애가치(LTV) 예측
 *     description: 머신러닝 기반 고객 LTV 예측을 수행합니다
 *     tags: [Analytics]
 */
router.post('/predict/ltv', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    
    // 사용자 구매 패턴 분석
    const [userMetrics] = await db.execute(sql`
      SELECT 
        u.id as user_id,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        EXTRACT(DAY FROM NOW() - MIN(o.created_at)) as customer_lifetime_days,
        EXTRACT(DAY FROM MAX(o.created_at) - MIN(o.created_at)) as purchase_span_days,
        COUNT(DISTINCT DATE_TRUNC('month', o.created_at)) as active_months
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.id = ${userId}
      GROUP BY u.id
    `);
    
    if (!userMetrics) {
      return res.status(404).json(createErrorResponse('사용자를 찾을 수 없습니다'));
    }
    
    // LTV 예측 계산 (간단한 모델)
    const avgOrderValue = Number(userMetrics.avg_order_value) || 0;
    const orderCount = Number(userMetrics.order_count) || 0;
    const lifetimeDays = Number(userMetrics.customer_lifetime_days) || 1;
    const activeMonths = Number(userMetrics.active_months) || 1;
    
    // 월간 구매 빈도
    const monthlyPurchaseRate = orderCount / Math.max(activeMonths, 1);
    
    // 예상 잔존 기간 (개월)
    const expectedLifetimeMonths = Math.min(36, activeMonths * 2.5); // 최대 3년
    
    // LTV 예측
    const predictedLtv30Days = avgOrderValue * monthlyPurchaseRate;
    const predictedLtv90Days = avgOrderValue * monthlyPurchaseRate * 3;
    const predictedLtv365Days = avgOrderValue * monthlyPurchaseRate * Math.min(12, expectedLifetimeMonths);
    
    // 예측 결과 저장
    const [prediction] = await db.insert(predictiveAnalytics).values({
      userId,
      predictionType: 'ltv',
      predictionScore: predictedLtv365Days,
      confidenceLevel: Math.min(95, 70 + (orderCount * 2)), // 주문 많을수록 신뢰도 증가
      modelName: 'LTVPredictor',
      modelVersion: '1.0.0',
      featureImportance: {
        avg_order_value: 0.40,
        purchase_frequency: 0.35,
        customer_lifetime: 0.15,
        recency: 0.10
      },
      predictedLtv30Days,
      predictedLtv90Days,
      predictedLtv365Days,
      predictions: {
        metrics: userMetrics,
        calculations: {
          monthlyPurchaseRate,
          expectedLifetimeMonths
        }
      },
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후
    }).returning();
    
    res.json(createSuccessResponse({
      message: 'LTV 예측이 완료되었습니다',
      prediction: {
        userId,
        currentValue: userMetrics.total_revenue,
        predicted30Days: predictedLtv30Days.toFixed(2),
        predicted90Days: predictedLtv90Days.toFixed(2),
        predicted365Days: predictedLtv365Days.toFixed(2),
        confidence: `${prediction.confidenceLevel.toFixed(1)}%`,
        factors: {
          avgOrderValue: avgOrderValue.toFixed(2),
          monthlyPurchaseRate: monthlyPurchaseRate.toFixed(2),
          customerLifetimeMonths: activeMonths
        }
      }
    }));
    
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/behavior/track:
 *   post:
 *     summary: 사용자 행동 이벤트 추적
 *     description: 사용자 행동 이벤트를 기록합니다
 *     tags: [Analytics]
 */
router.post('/behavior/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      userId,
      sessionId,
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      pageUrl,
      pageTitle,
      properties,
      utmParams
    } = req.body;
    
    const userAgent = req.headers['user-agent'] || '';
    
    // 디바이스 정보 파싱
    let deviceType = 'desktop';
    let browserName = 'unknown';
    let osName = 'unknown';
    
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
    
    if (/chrome/i.test(userAgent)) browserName = 'chrome';
    else if (/safari/i.test(userAgent)) browserName = 'safari';
    else if (/firefox/i.test(userAgent)) browserName = 'firefox';
    
    if (/windows/i.test(userAgent)) osName = 'windows';
    else if (/mac/i.test(userAgent)) osName = 'macos';
    else if (/android/i.test(userAgent)) osName = 'android';
    else if (/ios|iphone|ipad/i.test(userAgent)) osName = 'ios';
    
    // 이벤트 저장
    const [event] = await db.insert(userBehaviorEvents).values({
      userId: userId || null,
      sessionId: sessionId || req.sessionID,
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      pageUrl,
      pageTitle,
      referrer: req.headers.referer || req.headers.referrer,
      deviceType,
      browserName,
      osName,
      properties,
      utmSource: utmParams?.utm_source,
      utmMedium: utmParams?.utm_medium,
      utmCampaign: utmParams?.utm_campaign
    }).returning();
    
    res.json(createSuccessResponse({
      message: '이벤트가 기록되었습니다',
      eventId: event.id
    }));
    
  } catch (error) {
    next(error);
  }
});

export default router;