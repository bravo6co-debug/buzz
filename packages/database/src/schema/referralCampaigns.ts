import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// 리퍼럴 캠페인 관리 테이블
export const referralCampaigns = pgTable('referral_campaigns', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  // 캠페인 기본 정보
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // UTM 파라미터 (마케팅 추적용)
  utmSource: varchar('utm_source', { length: 50 }).default('referral'),
  utmMedium: varchar('utm_medium', { length: 50 }).default('social'),
  utmCampaign: varchar('utm_campaign', { length: 100 }).unique().notNull(),
  utmTerm: varchar('utm_term', { length: 100 }), // 키워드
  utmContent: varchar('utm_content', { length: 100 }), // 콘텐츠 구분
  
  // 캠페인 목표 및 보상
  targetConversions: integer('target_conversions').default(10),
  rewardMultiplier: decimal('reward_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  
  // 상태 관리
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at'),
  
  // 타임스탬프
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// 사용자 템플릿 테이블
export const userTemplates = pgTable('user_templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  campaignId: integer('campaign_id').references(() => referralCampaigns.id),
  
  // 템플릿 정보
  platform: varchar('platform', { length: 50 }).notNull(), // kakao, naver, instagram, facebook
  templateName: varchar('template_name', { length: 100 }),
  templateText: text('template_text').notNull(),
  hashtags: text('hashtags').$type<string[]>(), // JSON array of hashtags
  callToAction: varchar('call_to_action', { length: 200 }),
  
  // AI 생성 여부
  isAiGenerated: boolean('is_ai_generated').default(false),
  
  // 성과 점수 (0~100)
  performanceScore: decimal('performance_score', { precision: 5, scale: 2 }).default('0.00'),
  
  // 타임스탬프
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
}, (table) => ({
  // 사용자당 캠페인별 플랫폼당 하나의 템플릿
  uniqueUserCampaignPlatform: unique().on(table.userId, table.campaignId, table.platform),
}));

// 템플릿 성과 분석 테이블
export const templateAnalytics = pgTable('template_analytics', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => userTemplates.id).notNull(),
  campaignId: integer('campaign_id').references(() => referralCampaigns.id).notNull(),
  
  // 성과 지표
  views: integer('views').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenueGenerated: integer('revenue_generated').default(0),
  
  // 평균 지표
  avgTimeToConversion: integer('avg_time_to_conversion'), // 초 단위
  bestPerformingHour: integer('best_performing_hour'), // 0-23
  
  // 날짜별 집계
  date: timestamp('date').default(sql`CURRENT_DATE`).notNull(),
  
  // 타임스탬프
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
}, (table) => ({
  // 템플릿별 날짜별 유니크
  uniqueTemplateDate: unique().on(table.templateId, table.date),
}));

// 사용자 업적 및 게임화 테이블
export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique().notNull(),
  
  // 레벨 시스템
  level: integer('level').default(1),
  totalXp: integer('total_xp').default(0),
  
  // 누적 통계
  totalReferrals: integer('total_referrals').default(0),
  totalRevenue: integer('total_revenue').default(0),
  bestConversionRate: decimal('best_conversion_rate', { precision: 5, scale: 2 }).default('0.00'),
  streakDays: integer('streak_days').default(0),
  lastActiveDate: timestamp('last_active_date'),
  
  // 뱃지 (JSON 배열)
  badges: text('badges').$type<string[]>().default(sql`'[]'::jsonb`),
  
  // 랭킹
  globalRank: integer('global_rank'),
  monthlyRank: integer('monthly_rank'),
  
  // 타임스탬프
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// A/B 테스트 테이블
export const abTests = pgTable('ab_tests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  campaignId: integer('campaign_id').references(() => referralCampaigns.id).notNull(),
  
  // 테스트 변형
  variantATemplateId: integer('variant_a_template_id').references(() => userTemplates.id).notNull(),
  variantBTemplateId: integer('variant_b_template_id').references(() => userTemplates.id).notNull(),
  
  // 트래픽 분할 (0.5 = 50/50)
  trafficSplit: decimal('traffic_split', { precision: 3, scale: 2 }).default('0.50'),
  
  // 결과
  winnerTemplateId: integer('winner_template_id').references(() => userTemplates.id),
  
  // 상태
  status: varchar('status', { length: 20 }).default('running'), // running, completed, paused
  
  // 타임스탬프
  startedAt: timestamp('started_at').default(sql`NOW()`).notNull(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// 일일 퀘스트 진행 상태
export const dailyQuests = pgTable('daily_quests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  // 퀘스트 진행 상태
  shareCount: integer('share_count').default(0),
  shareTarget: integer('share_target').default(3),
  
  convertCount: integer('convert_count').default(0),
  convertTarget: integer('convert_target').default(1),
  
  createCount: integer('create_count').default(0),
  createTarget: integer('create_target').default(1),
  
  // 보상 수령 여부
  rewardClaimed: boolean('reward_claimed').default(false),
  rewardAmount: integer('reward_amount').default(100), // 마일리지
  
  // 날짜
  questDate: timestamp('quest_date').default(sql`CURRENT_DATE`).notNull(),
  
  // 타임스탬프
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
}, (table) => ({
  // 사용자별 날짜별 유니크
  uniqueUserDate: unique().on(table.userId, table.questDate),
}));