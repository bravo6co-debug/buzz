import { pgTable, serial, integer, text, json, timestamp, boolean, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { users } from './users';

export const businessReviews = pgTable('business_reviews', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').references(() => businesses.id),
  userId: integer('user_id').references(() => users.id),
  rating: integer('rating').notNull(),
  reviewText: text('review_text'),
  images: json('images'),
  // 사장님 답글 필드 추가
  ownerReply: text('owner_reply'),
  ownerReplyAt: timestamp('owner_reply_at'),
  // 알림을 위한 읽음 상태
  isReadByOwner: boolean('is_read_by_owner').default(false),
  isReadByUser: boolean('is_read_by_user').default(true), // 작성자는 자동으로 읽음 처리
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
}, (table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
}));