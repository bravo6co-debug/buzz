import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: integer('referrer_id').references(() => users.id), // 추천인
  refereeId: integer('referee_id').references(() => users.id), // 피추천인
  referralCode: varchar('referral_code', { length: 50 }), // 사용된 리퍼럴 코드
  rewardAmount: integer('reward_amount'), // 추천인에게 지급된 보상
  signupBonus: integer('signup_bonus'), // 피추천인에게 지급된 가입 보상
  status: varchar('status', { length: 20 }).default('completed').notNull(), // pending, completed, cancelled
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});