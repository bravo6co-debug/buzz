import { pgTable, serial, varchar, integer, timestamp, jsonb, decimal, boolean, text, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 코호트 분석 테이블
export const cohortAnalysis = pgTable('cohort_analysis', {
  id: serial('id').primaryKey(),
  
  // 코호트 정의
  cohortName: varchar('cohort_name', { length: 100 }).notNull(),
  cohortType: varchar('cohort_type', { length: 50 }).notNull(), // signup_date, first_purchase, referral_source
  cohortDate: date('cohort_date').notNull(),
  cohortSize: integer('cohort_size').notNull(),
  
  // 리텐션 데이터
  day0Users: integer('day_0_users').notNull(),
  day1Users: integer('day_1_users'),
  day7Users: integer('day_7_users'),
  day14Users: integer('day_14_users'),
  day30Users: integer('day_30_users'),
  day60Users: integer('day_60_users'),
  day90Users: integer('day_90_users'),
  
  // 리텐션 비율
  day1Retention: decimal('day_1_retention', { precision: 5, scale: 2 }),
  day7Retention: decimal('day_7_retention', { precision: 5, scale: 2 }),
  day14Retention: decimal('day_14_retention', { precision: 5, scale: 2 }),
  day30Retention: decimal('day_30_retention', { precision: 5, scale: 2 }),
  day60Retention: decimal('day_60_retention', { precision: 5, scale: 2 }),
  day90Retention: decimal('day_90_retention', { precision: 5, scale: 2 }),
  
  // 행동 메트릭
  avgOrdersPerUser: decimal('avg_orders_per_user', { precision: 10, scale: 2 }),
  avgRevenuePerUser: decimal('avg_revenue_per_user', { precision: 10, scale: 2 }),
  avgSessionsPerUser: decimal('avg_sessions_per_user', { precision: 10, scale: 2 }),
  avgReferralsPerUser: decimal('avg_referrals_per_user', { precision: 10, scale: 2 }),
  
  // 세그먼트 정보
  segment: jsonb('segment'), // { source: 'organic', location: 'seoul', device: 'mobile' }
  
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// 퍼널 분석 테이블
export const funnelAnalysis = pgTable('funnel_analysis', {
  id: serial('id').primaryKey(),
  
  // 퍼널 정의
  funnelName: varchar('funnel_name', { length: 100 }).notNull(),
  funnelType: varchar('funnel_type', { length: 50 }).notNull(), // signup, purchase, referral
  
  // 퍼널 단계
  steps: jsonb('steps').notNull(), // [{ name: 'Visit', count: 1000 }, { name: 'Signup', count: 300 }]
  
  // 전환율
  totalUsers: integer('total_users').notNull(),
  completedUsers: integer('completed_users').notNull(),
  overallConversionRate: decimal('overall_conversion_rate', { precision: 5, scale: 2 }).notNull(),
  
  // 단계별 전환율
  stepConversions: jsonb('step_conversions'), // { 'Visit->Signup': 30, 'Signup->Purchase': 20 }
  
  // 드롭오프 분석
  dropoffPoints: jsonb('dropoff_points'), // [{ step: 'Signup', dropoffRate: 70, reasons: [...] }]
  
  // 평균 소요 시간
  avgCompletionTime: integer('avg_completion_time'), // 초 단위
  medianCompletionTime: integer('median_completion_time'),
  
  // 세그먼트 정보
  segment: jsonb('segment'),
  dateRange: jsonb('date_range'), // { start: '2024-01-01', end: '2024-01-31' }
  
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

// 예측 분석 테이블
export const predictiveAnalytics = pgTable('predictive_analytics', {
  id: serial('id').primaryKey(),
  
  // 예측 대상
  userId: integer('user_id'),
  businessId: integer('business_id'),
  
  // 예측 타입
  predictionType: varchar('prediction_type', { length: 50 }).notNull(), // churn, ltv, next_purchase, fraud_risk
  
  // 예측 값
  predictionScore: decimal('prediction_score', { precision: 10, scale: 4 }).notNull(),
  confidenceLevel: decimal('confidence_level', { precision: 5, scale: 2 }).notNull(),
  
  // 모델 정보
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 20 }).notNull(),
  
  // 예측 근거 (특징 중요도)
  featureImportance: jsonb('feature_importance'), // { 'last_login_days': 0.3, 'order_count': 0.25 }
  
  // 추가 예측 정보
  predictions: jsonb('predictions'), // 상세 예측 데이터
  
  // 이탈 예측 전용 필드
  churnProbability: decimal('churn_probability', { precision: 5, scale: 2 }),
  churnRiskLevel: varchar('churn_risk_level', { length: 20 }), // low, medium, high, critical
  recommendedActions: jsonb('recommended_actions'), // 추천 조치사항
  
  // LTV 예측 전용 필드
  predictedLtv30Days: decimal('predicted_ltv_30_days', { precision: 10, scale: 2 }),
  predictedLtv90Days: decimal('predicted_ltv_90_days', { precision: 10, scale: 2 }),
  predictedLtv365Days: decimal('predicted_ltv_365_days', { precision: 10, scale: 2 }),
  
  // 실제 결과 (예측 검증용)
  actualOutcome: jsonb('actual_outcome'),
  accuracyScore: decimal('accuracy_score', { precision: 5, scale: 2 }),
  
  predictedAt: timestamp('predicted_at').default(sql`NOW()`).notNull(),
  validUntil: timestamp('valid_until').notNull(),
});

// 사용자 행동 이벤트 테이블 (분석 기반 데이터)
export const userBehaviorEvents = pgTable('user_behavior_events', {
  id: serial('id').primaryKey(),
  
  userId: integer('user_id').notNull(),
  sessionId: varchar('session_id', { length: 128 }).notNull(),
  
  // 이벤트 정보
  eventType: varchar('event_type', { length: 50 }).notNull(), // pageview, click, signup, purchase
  eventCategory: varchar('event_category', { length: 50 }),
  eventAction: varchar('event_action', { length: 100 }),
  eventLabel: varchar('event_label', { length: 255 }),
  eventValue: decimal('event_value', { precision: 10, scale: 2 }),
  
  // 페이지 정보
  pageUrl: text('page_url'),
  pageTitle: varchar('page_title', { length: 255 }),
  referrer: text('referrer'),
  
  // 디바이스 정보
  deviceType: varchar('device_type', { length: 20 }),
  browserName: varchar('browser_name', { length: 50 }),
  osName: varchar('os_name', { length: 50 }),
  
  // 추가 속성
  properties: jsonb('properties'),
  
  // UTM 파라미터
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  
  timestamp: timestamp('timestamp').default(sql`NOW()`).notNull(),
});

// 이상 패턴 감지 테이블
export const anomalyDetection = pgTable('anomaly_detection', {
  id: serial('id').primaryKey(),
  
  // 이상 감지 대상
  entityType: varchar('entity_type', { length: 50 }).notNull(), // user, business, transaction
  entityId: integer('entity_id').notNull(),
  
  // 이상 유형
  anomalyType: varchar('anomaly_type', { length: 100 }).notNull(), // unusual_activity, fraud_pattern, bot_behavior
  anomalyScore: decimal('anomaly_score', { precision: 5, scale: 2 }).notNull(), // 0-100
  
  // 이상 세부사항
  description: text('description').notNull(),
  detectedPatterns: jsonb('detected_patterns'), // 감지된 패턴 상세
  
  // 위험도 평가
  riskLevel: varchar('risk_level', { length: 20 }).notNull(), // low, medium, high, critical
  impactScore: integer('impact_score'), // 영향도 점수
  
  // 비교 기준
  baselineMetrics: jsonb('baseline_metrics'), // 정상 패턴 기준값
  observedMetrics: jsonb('observed_metrics'), // 관찰된 값
  deviationPercentage: decimal('deviation_percentage', { precision: 10, scale: 2 }),
  
  // 조치사항
  actionTaken: varchar('action_taken', { length: 100 }),
  actionTimestamp: timestamp('action_timestamp'),
  resolvedAt: timestamp('resolved_at'),
  isResolved: boolean('is_resolved').default(false),
  
  // 알림 정보
  alertSent: boolean('alert_sent').default(false),
  alertSentAt: timestamp('alert_sent_at'),
  
  detectedAt: timestamp('detected_at').default(sql`NOW()`).notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

// 2단계 인증 테이블
export const twoFactorAuth = pgTable('two_factor_auth', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  
  // 2FA 설정
  isEnabled: boolean('is_enabled').default(false).notNull(),
  method: varchar('method', { length: 20 }), // sms, email, totp, backup_codes
  
  // TOTP (Time-based One-Time Password) 설정
  totpSecret: varchar('totp_secret', { length: 64 }),
  totpBackupCodes: jsonb('totp_backup_codes'), // 백업 코드 배열
  
  // SMS/Email OTP 설정
  phoneVerified: boolean('phone_verified').default(false),
  emailVerified: boolean('email_verified').default(false),
  
  // 최근 인증 정보
  lastVerifiedAt: timestamp('last_verified_at'),
  lastVerifiedIp: varchar('last_verified_ip', { length: 45 }),
  lastVerifiedDevice: varchar('last_verified_device', { length: 255 }),
  
  // 시도 제한
  failedAttempts: integer('failed_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  
  // 복구 정보
  recoveryEmail: varchar('recovery_email', { length: 255 }),
  recoveryPhone: varchar('recovery_phone', { length: 20 }),
  
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// OTP 검증 로그
export const otpVerificationLogs = pgTable('otp_verification_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  
  // OTP 정보
  otpType: varchar('otp_type', { length: 20 }).notNull(), // sms, email, totp
  otpCode: varchar('otp_code', { length: 10 }),
  
  // 검증 결과
  isSuccess: boolean('is_success').notNull(),
  failureReason: varchar('failure_reason', { length: 100 }),
  
  // 요청 정보
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceFingerprint: varchar('device_fingerprint', { length: 64 }),
  
  attemptedAt: timestamp('attempted_at').default(sql`NOW()`).notNull(),
  expiresAt: timestamp('expires_at'),
});

// 인덱스 정의
export const analyticsIndexes = {
  cohortDateIdx: sql`CREATE INDEX idx_cohort_date ON cohort_analysis(cohort_date DESC)`,
  cohortTypeIdx: sql`CREATE INDEX idx_cohort_type ON cohort_analysis(cohort_type)`,
  funnelNameIdx: sql`CREATE INDEX idx_funnel_name ON funnel_analysis(funnel_name)`,
  predictionUserIdx: sql`CREATE INDEX idx_prediction_user ON predictive_analytics(user_id)`,
  predictionTypeIdx: sql`CREATE INDEX idx_prediction_type ON predictive_analytics(prediction_type)`,
  behaviorUserIdx: sql`CREATE INDEX idx_behavior_user ON user_behavior_events(user_id)`,
  behaviorSessionIdx: sql`CREATE INDEX idx_behavior_session ON user_behavior_events(session_id)`,
  behaviorTimestampIdx: sql`CREATE INDEX idx_behavior_timestamp ON user_behavior_events(timestamp DESC)`,
  anomalyEntityIdx: sql`CREATE INDEX idx_anomaly_entity ON anomaly_detection(entity_type, entity_id)`,
  anomalyRiskIdx: sql`CREATE INDEX idx_anomaly_risk ON anomaly_detection(risk_level)`,
  twoFactorUserIdx: sql`CREATE INDEX idx_2fa_user ON two_factor_auth(user_id)`,
  otpUserIdx: sql`CREATE INDEX idx_otp_user ON otp_verification_logs(user_id)`,
};