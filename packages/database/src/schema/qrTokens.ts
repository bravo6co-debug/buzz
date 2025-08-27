import { pgTable, serial, integer, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { coupons } from './coupons';

export const qrTokens = pgTable('qr_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tokenType: varchar('token_type', { length: 20 }).notNull(), // 'coupon', 'mileage'
  referenceId: integer('reference_id'), // coupon id for coupon tokens, null for mileage
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(), // JWT token hash for uniqueness
  isUsed: boolean('is_used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  usedBusinessId: integer('used_business_id'),
  expiresAt: timestamp('expires_at').notNull(),
  metadata: jsonb('metadata'), // Additional data like amount for mileage
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

export const qrUsageLogs = pgTable('qr_usage_logs', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').references(() => qrTokens.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  businessUserId: integer('business_user_id').references(() => users.id),
  businessId: integer('business_id'),
  action: varchar('action', { length: 50 }).notNull(), // 'generated', 'scanned', 'verified', 'used', 'expired'
  tokenType: varchar('token_type', { length: 20 }).notNull(),
  amount: integer('amount'), // For mileage usage
  discountAmount: integer('discount_amount'), // For coupon usage
  governmentSupport: integer('government_support'), // For event coupons
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});