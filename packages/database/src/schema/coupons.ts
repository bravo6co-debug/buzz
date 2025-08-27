import { pgTable, serial, integer, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  couponType: varchar('coupon_type', { length: 20 }).notNull(), // basic, event, mileage_qr
  discountType: varchar('discount_type', { length: 20 }), // amount, percentage
  discountValue: integer('discount_value'), // 할인 금액 또는 퍼센트
  isUsed: boolean('is_used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  usedBusinessId: integer('used_business_id').references(() => users.id),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});