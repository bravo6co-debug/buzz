import { pgTable, serial, integer, varchar, text, json, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id), // 사업자 계정
  businessName: varchar('business_name', { length: 200 }).notNull(),
  description: text('description'),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  category: varchar('category', { length: 50 }),
  images: json('images'), // 매장 사진 URLs
  businessHours: json('business_hours'), // 영업시간 정보
  rating: decimal('rating', { precision: 2, scale: 1 }).default('0'),
  reviewCount: integer('review_count').default(0),
  isApproved: boolean('is_approved').default(false).notNull(), // 남지 승인 여부
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});