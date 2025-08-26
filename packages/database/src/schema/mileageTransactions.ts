import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const mileageTransactions = pgTable('mileage_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  transactionType: varchar('transaction_type', { length: 20 }).notNull(), // earn, use, admin_adjust
  amount: integer('amount').notNull(), // 양수: 적립, 음수: 사용
  description: text('description'),
  referenceType: varchar('reference_type', { length: 20 }), // referral, signup, mileage_use, admin
  referenceId: integer('reference_id'), // 관련 레코드 ID
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});