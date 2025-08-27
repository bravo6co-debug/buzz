import { db } from '@buzz/database';
import { 
  anomalyDetection, 
  userBehaviorEvents, 
  signupAttempts,
  deviceFingerprints 
} from '@buzz/database/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';

export class AnomalyDetectionService {
  // 패턴 임계값 설정
  private static readonly THRESHOLDS = {
    // 사용자 행동 패턴
    maxOrdersPerDay: 20,
    maxOrdersPerHour: 10,
    maxAmountPerOrder: 1000000, // 100만원
    minTimeBetweenOrders: 60, // 초 단위
    
    // 리퍼럴 패턴
    maxReferralsPerDay: 10,
    maxReferralsPerWeek: 30,
    minTimeBetweenReferrals: 300, // 5분
    
    // 로그인 패턴
    maxFailedLoginsPerHour: 5,
    maxPasswordResetsPerDay: 3,
    maxDevicesPerUser: 5,
    
    // 비즈니스 패턴
    maxReviewsPerDay: 10,
    minTimeBetweenReviews: 600, // 10분
    maxCouponUsagePerDay: 5,
  };

  /**
   * 사용자 행동 이상 감지
   */
  static async detectUserAnomalies(userId: number): Promise<any[]> {
    const anomalies = [];
    
    // 최근 24시간 주문 패턴 분석
    const recentOrders = await db.execute(sql`
      SELECT 
        COUNT(*) as order_count,
        MAX(total_amount) as max_amount,
        MIN(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as min_interval
      FROM orders
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const orderStats = recentOrders[0];
    
    // 비정상적인 주문 빈도 감지
    if (orderStats.order_count > this.THRESHOLDS.maxOrdersPerDay) {
      anomalies.push({
        type: 'excessive_orders',
        severity: 'high',
        score: Math.min(100, (orderStats.order_count / this.THRESHOLDS.maxOrdersPerDay) * 70),
        description: `24시간 내 비정상적으로 많은 주문 (${orderStats.order_count}건)`,
        recommendation: '계정 일시 정지 및 검토 필요'
      });
    }
    
    // 비정상적인 주문 금액 감지
    if (orderStats.max_amount > this.THRESHOLDS.maxAmountPerOrder) {
      anomalies.push({
        type: 'suspicious_amount',
        severity: 'critical',
        score: Math.min(100, (orderStats.max_amount / this.THRESHOLDS.maxAmountPerOrder) * 80),
        description: `비정상적으로 높은 주문 금액 (${orderStats.max_amount}원)`,
        recommendation: '결제 수단 확인 및 추가 인증 필요'
      });
    }
    
    // 봇 행동 패턴 감지 (너무 빠른 연속 주문)
    if (orderStats.min_interval && orderStats.min_interval < this.THRESHOLDS.minTimeBetweenOrders) {
      anomalies.push({
        type: 'bot_behavior',
        severity: 'critical',
        score: 90,
        description: `봇으로 의심되는 행동 패턴 (주문 간격: ${orderStats.min_interval}초)`,
        recommendation: 'CAPTCHA 인증 또는 계정 차단'
      });
    }
    
    // 다중 디바이스 사용 패턴 분석
    const deviceCount = await db.execute(sql`
      SELECT COUNT(DISTINCT fingerprint_id) as device_count
      FROM signup_attempts
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);
    
    if (deviceCount[0].device_count > this.THRESHOLDS.maxDevicesPerUser) {
      anomalies.push({
        type: 'multiple_devices',
        severity: 'medium',
        score: 60,
        description: `비정상적으로 많은 디바이스 사용 (${deviceCount[0].device_count}개)`,
        recommendation: '계정 공유 또는 부정 사용 의심'
      });
    }
    
    return anomalies;
  }

  /**
   * 리퍼럴 이상 패턴 감지
   */
  static async detectReferralAnomalies(userId: number): Promise<any[]> {
    const anomalies = [];
    
    // 최근 리퍼럴 활동 분석
    const referralStats = await db.execute(sql`
      SELECT 
        COUNT(*) as referral_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as daily_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_count,
        MIN(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as min_interval
      FROM referrals
      WHERE referrer_id = ${userId}
    `);
    
    const stats = referralStats[0];
    
    // 비정상적인 리퍼럴 빈도
    if (stats.daily_count > this.THRESHOLDS.maxReferralsPerDay) {
      anomalies.push({
        type: 'excessive_referrals',
        severity: 'high',
        score: 75,
        description: `일일 리퍼럴 한도 초과 (${stats.daily_count}건)`,
        recommendation: '리퍼럴 보상 지급 보류 및 검토'
      });
    }
    
    // 자동화된 리퍼럴 의심
    if (stats.min_interval && stats.min_interval < this.THRESHOLDS.minTimeBetweenReferrals) {
      anomalies.push({
        type: 'automated_referrals',
        severity: 'critical',
        score: 85,
        description: `자동화 도구 사용 의심 (리퍼럴 간격: ${stats.min_interval}초)`,
        recommendation: '리퍼럴 기능 차단 및 계정 검토'
      });
    }
    
    // 동일 IP/디바이스에서 다수 가입 감지
    const suspiciousReferrals = await db.execute(sql`
      SELECT 
        ip_address,
        COUNT(*) as signup_count
      FROM signup_attempts sa
      JOIN referrals r ON sa.referral_code = (
        SELECT referral_code FROM users WHERE id = ${userId}
      )
      WHERE r.referrer_id = ${userId}
        AND sa.status = 'success'
      GROUP BY ip_address
      HAVING COUNT(*) > 2
    `);
    
    if (suspiciousReferrals.length > 0) {
      anomalies.push({
        type: 'suspicious_referral_pattern',
        severity: 'critical',
        score: 95,
        description: '동일 IP에서 다수 리퍼럴 가입 감지',
        recommendation: '리퍼럴 보상 차단 및 부정 사용 조사'
      });
    }
    
    return anomalies;
  }

  /**
   * 비즈니스 관련 이상 패턴 감지
   */
  static async detectBusinessAnomalies(businessId: number): Promise<any[]> {
    const anomalies = [];
    
    // 리뷰 조작 패턴 감지
    const reviewPatterns = await db.execute(sql`
      SELECT 
        COUNT(*) as review_count,
        AVG(rating) as avg_rating,
        STDDEV(rating) as rating_stddev,
        COUNT(DISTINCT user_id) as unique_reviewers,
        COUNT(CASE WHEN LENGTH(comment) < 10 THEN 1 END) as short_reviews
      FROM reviews
      WHERE business_id = ${businessId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const reviewStats = reviewPatterns[0];
    
    // 의심스러운 리뷰 패턴
    if (reviewStats.rating_stddev < 0.5 && reviewStats.review_count > 10) {
      anomalies.push({
        type: 'suspicious_review_pattern',
        severity: 'high',
        score: 70,
        description: '비정상적으로 일정한 평점 패턴',
        recommendation: '리뷰 조작 의심, 상세 검토 필요'
      });
    }
    
    // 짧은 리뷰 비율이 높은 경우
    const shortReviewRatio = reviewStats.short_reviews / reviewStats.review_count;
    if (shortReviewRatio > 0.7) {
      anomalies.push({
        type: 'low_quality_reviews',
        severity: 'medium',
        score: 50,
        description: '낮은 품질의 리뷰 비율이 높음',
        recommendation: '리뷰 가이드라인 강화 필요'
      });
    }
    
    // 정산 이상 패턴 감지
    const settlementPatterns = await db.execute(sql`
      SELECT 
        COUNT(*) as settlement_count,
        SUM(amount) as total_amount,
        MAX(amount) as max_amount,
        AVG(amount) as avg_amount
      FROM settlements
      WHERE business_id = ${businessId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const settlementStats = settlementPatterns[0];
    
    // 급격한 매출 증가 감지
    const previousMonthSettlement = await db.execute(sql`
      SELECT SUM(amount) as total_amount
      FROM settlements
      WHERE business_id = ${businessId}
        AND created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days'
    `);
    
    if (previousMonthSettlement[0].total_amount) {
      const growthRate = (settlementStats.total_amount - previousMonthSettlement[0].total_amount) / previousMonthSettlement[0].total_amount;
      if (growthRate > 3) { // 300% 이상 증가
        anomalies.push({
          type: 'abnormal_revenue_spike',
          severity: 'high',
          score: 80,
          description: `비정상적인 매출 증가 (${(growthRate * 100).toFixed(0)}%)`,
          recommendation: '거래 내역 상세 검토 필요'
        });
      }
    }
    
    return anomalies;
  }

  /**
   * 실시간 이상 패턴 모니터링
   */
  static async monitorRealTimeAnomalies(): Promise<void> {
    // 최근 1시간 내 이상 패턴 감지
    const recentAnomalies = await db.execute(sql`
      WITH recent_activity AS (
        SELECT 
          'signup' as activity_type,
          COUNT(*) as count,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM signup_attempts
        WHERE attempted_at >= NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 
          'order' as activity_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      )
      SELECT * FROM recent_activity
    `);
    
    for (const activity of recentAnomalies) {
      // 비정상적인 활동량 감지
      if (activity.activity_type === 'signup' && activity.count > 100) {
        await this.createAnomaly({
          entityType: 'system',
          entityId: 0,
          anomalyType: 'signup_surge',
          anomalyScore: 75,
          description: `1시간 내 비정상적인 가입 시도 (${activity.count}건)`,
          riskLevel: 'high'
        });
      }
      
      if (activity.activity_type === 'order' && activity.count > 500) {
        await this.createAnomaly({
          entityType: 'system',
          entityId: 0,
          anomalyType: 'order_surge',
          anomalyScore: 70,
          description: `1시간 내 비정상적인 주문량 (${activity.count}건)`,
          riskLevel: 'medium'
        });
      }
    }
  }

  /**
   * 이상 패턴 기록
   */
  private static async createAnomaly(data: any): Promise<void> {
    await db.insert(anomalyDetection).values({
      entityType: data.entityType,
      entityId: data.entityId,
      anomalyType: data.anomalyType,
      anomalyScore: data.anomalyScore,
      description: data.description,
      detectedPatterns: data.patterns || {},
      riskLevel: data.riskLevel,
      impactScore: data.impactScore || 0,
      baselineMetrics: data.baseline || {},
      observedMetrics: data.observed || {},
      deviationPercentage: data.deviation || 0,
      alertSent: false
    });
  }

  /**
   * 종합 이상 점수 계산
   */
  static calculateAnomalyScore(anomalies: any[]): number {
    if (anomalies.length === 0) return 0;
    
    // 가중 평균 계산
    const totalScore = anomalies.reduce((sum, anomaly) => {
      const weight = anomaly.severity === 'critical' ? 1.5 : 
                    anomaly.severity === 'high' ? 1.2 : 
                    anomaly.severity === 'medium' ? 1.0 : 0.8;
      return sum + (anomaly.score * weight);
    }, 0);
    
    const totalWeight = anomalies.reduce((sum, anomaly) => {
      return sum + (anomaly.severity === 'critical' ? 1.5 : 
                   anomaly.severity === 'high' ? 1.2 : 
                   anomaly.severity === 'medium' ? 1.0 : 0.8);
    }, 0);
    
    return Math.min(100, totalScore / totalWeight);
  }
}