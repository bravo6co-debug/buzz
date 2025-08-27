import { pgTable, serial, varchar, text, timestamp, inet, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 디바이스 핑거프린트 테이블
export const deviceFingerprints = pgTable('device_fingerprints', {
  id: serial('id').primaryKey(),
  
  // 디바이스 식별 정보
  fingerprintHash: varchar('fingerprint_hash', { length: 64 }).unique().notNull(), // SHA-256 해시
  ipAddress: inet('ip_address').notNull(),
  ipCountry: varchar('ip_country', { length: 2 }), // ISO 국가 코드
  ipCity: varchar('ip_city', { length: 100 }),
  userAgent: text('user_agent').notNull(),
  
  // 브라우저/디바이스 정보
  browserName: varchar('browser_name', { length: 50 }),
  browserVersion: varchar('browser_version', { length: 20 }),
  osName: varchar('os_name', { length: 50 }),
  osVersion: varchar('os_version', { length: 20 }),
  deviceType: varchar('device_type', { length: 20 }), // mobile, tablet, desktop
  deviceVendor: varchar('device_vendor', { length: 50 }),
  
  // 핑거프린트 세부 정보 (JSON)
  fingerprintData: jsonb('fingerprint_data'), // canvas, webgl, timezone, plugins 등
  
  // 위험도 평가
  riskScore: integer('risk_score').default(0), // 0-100, 높을수록 위험
  isVpn: boolean('is_vpn').default(false),
  isProxy: boolean('is_proxy').default(false),
  isTor: boolean('is_tor').default(false),
  isDatacenter: boolean('is_datacenter').default(false),
  
  // 사용 통계
  signupAttempts: integer('signup_attempts').default(0),
  successfulSignups: integer('successful_signups').default(0),
  lastSignupAttempt: timestamp('last_signup_attempt'),
  
  // 차단 정보
  isBlocked: boolean('is_blocked').default(false),
  blockedReason: text('blocked_reason'),
  blockedAt: timestamp('blocked_at'),
  blockedUntil: timestamp('blocked_until'), // 임시 차단용
  
  // 메타데이터
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// 가입 시도 로그 테이블
export const signupAttempts = pgTable('signup_attempts', {
  id: serial('id').primaryKey(),
  
  // 시도 정보
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  ipAddress: inet('ip_address').notNull(),
  fingerprintId: integer('fingerprint_id').references(() => deviceFingerprints.id),
  
  // 시도 결과
  status: varchar('status', { length: 20 }).notNull(), // pending, success, blocked, failed
  blockedReason: varchar('blocked_reason', { length: 100 }), // duplicate_ip, duplicate_device, vpn_detected, rate_limit
  
  // 리퍼럴 정보
  referralCode: varchar('referral_code', { length: 50 }),
  referrerId: integer('referrer_id'),
  
  // 추가 정보
  userAgent: text('user_agent'),
  headers: jsonb('headers'), // 모든 HTTP 헤더 저장
  sessionId: varchar('session_id', { length: 128 }),
  
  // 위험도 평가
  riskScore: integer('risk_score').default(0),
  riskFactors: jsonb('risk_factors'), // 위험 요소 상세
  
  // 타임스탬프
  attemptedAt: timestamp('attempted_at').default(sql`NOW()`).notNull(),
  completedAt: timestamp('completed_at'),
});

// IP 차단 리스트
export const ipBlacklist = pgTable('ip_blacklist', {
  id: serial('id').primaryKey(),
  ipAddress: inet('ip_address').unique().notNull(),
  ipRange: varchar('ip_range', { length: 50 }), // CIDR 표기법
  reason: text('reason').notNull(),
  source: varchar('source', { length: 50 }), // manual, automated, external
  severity: varchar('severity', { length: 20 }).default('medium'), // low, medium, high, critical
  
  // 차단 기간
  isActive: boolean('is_active').default(true),
  blockedAt: timestamp('blocked_at').default(sql`NOW()`).notNull(),
  expiresAt: timestamp('expires_at'), // NULL이면 영구 차단
  
  // 통계
  blockCount: integer('block_count').default(0),
  lastBlockedAt: timestamp('last_blocked_at'),
  
  // 메타데이터
  addedBy: integer('added_by'), // 관리자 ID
  notes: text('notes'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// 디바이스 신뢰도 테이블
export const trustedDevices = pgTable('trusted_devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  fingerprintId: integer('fingerprint_id').references(() => deviceFingerprints.id),
  
  // 신뢰 정보
  deviceName: varchar('device_name', { length: 100 }), // 사용자가 지정한 이름
  trustLevel: integer('trust_level').default(1), // 1-5, 높을수록 신뢰
  lastVerified: timestamp('last_verified').default(sql`NOW()`),
  
  // 2FA 설정
  requires2FA: boolean('requires_2fa').default(false),
  lastUsed: timestamp('last_used'),
  useCount: integer('use_count').default(0),
  
  // 상태
  isActive: boolean('is_active').default(true),
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
  
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  expiresAt: timestamp('expires_at'), // 신뢰 만료 시간
});

// 딥링크 분석 테이블
export const deeplinkAnalytics = pgTable('deeplink_analytics', {
  id: serial('id').primaryKey(),
  
  // 딥링크 정보
  action: varchar('action', { length: 50 }).notNull(),
  referralCode: varchar('referral_code', { length: 50 }),
  campaignId: integer('campaign_id'),
  businessId: integer('business_id'),
  templateId: integer('template_id'),
  
  // UTM 파라미터
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  utmTerm: varchar('utm_term', { length: 100 }),
  utmContent: varchar('utm_content', { length: 100 }),
  
  // 사용자 정보
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  platform: varchar('platform', { length: 50 }), // ios, android, web
  deviceType: varchar('device_type', { length: 20 }), // mobile, tablet, desktop
  
  // 이벤트 타입
  eventType: varchar('event_type', { length: 50 }).notNull(), // click, install, signup, conversion
  
  // 전환 정보
  converted: boolean('converted').default(false),
  convertedAt: timestamp('converted_at'),
  conversionValue: integer('conversion_value'), // 전환 가치 (원)
  userId: integer('user_id'), // 전환된 사용자 ID
  
  // 세션 정보
  sessionId: varchar('session_id', { length: 128 }),
  referrerUrl: text('referrer_url'),
  landingPage: text('landing_page'),
  
  // 타임스탬프
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

// 인덱스 생성을 위한 export
export const deviceFingerprintsIndexes = {
  ipAddressIdx: sql`CREATE INDEX idx_device_fingerprints_ip ON device_fingerprints(ip_address)`,
  fingerprintHashIdx: sql`CREATE INDEX idx_device_fingerprints_hash ON device_fingerprints(fingerprint_hash)`,
  createdAtIdx: sql`CREATE INDEX idx_device_fingerprints_created ON device_fingerprints(created_at DESC)`,
};

export const signupAttemptsIndexes = {
  emailIdx: sql`CREATE INDEX idx_signup_attempts_email ON signup_attempts(email)`,
  ipAddressIdx: sql`CREATE INDEX idx_signup_attempts_ip ON signup_attempts(ip_address)`,
  statusIdx: sql`CREATE INDEX idx_signup_attempts_status ON signup_attempts(status)`,
  attemptedAtIdx: sql`CREATE INDEX idx_signup_attempts_attempted ON signup_attempts(attempted_at DESC)`,
};

export const deeplinkAnalyticsIndexes = {
  referralCodeIdx: sql`CREATE INDEX idx_deeplink_analytics_referral ON deeplink_analytics(referral_code)`,
  campaignIdIdx: sql`CREATE INDEX idx_deeplink_analytics_campaign ON deeplink_analytics(campaign_id)`,
  eventTypeIdx: sql`CREATE INDEX idx_deeplink_analytics_event ON deeplink_analytics(event_type)`,
  createdAtIdx: sql`CREATE INDEX idx_deeplink_analytics_created ON deeplink_analytics(created_at DESC)`,
};