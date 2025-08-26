import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { businesses } from './businesses';

export const businessSettlements = pgTable('business_settlements', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').references(() => businesses.id),
  settlementType: varchar('settlement_type', { length: 20 }), // mileage_use, event_coupon
  amount: integer('amount').notNull(), // 정산 금액
  referenceType: varchar('reference_type', { length: 20 }), // mileage_transaction, coupon
  referenceId: integer('reference_id'), // 관련 거래 ID
  status: varchar('status', { length: 20 }).default('requested').notNull(), // requested, approved, paid, rejected
  requestedAt: timestamp('requested_at').default(sql`NOW()`).notNull(),
  processedAt: timestamp('processed_at'),
});