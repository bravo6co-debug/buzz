import { pgTable, serial, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).unique(),
  role: varchar('role', { length: 20 }).default('user').notNull(), // user, business, admin
  mileageBalance: integer('mileage_balance').default(0).notNull(),
  referralCode: varchar('referral_code', { length: 50 }).unique(), // 개인 리퍼럴 코드
  fcmToken: varchar('fcm_token', { length: 500 }), // Firebase Cloud Messaging 토큰
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});