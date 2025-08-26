import { pgTable, serial, integer, text, json, timestamp, check } from 'drizzle-orm/pg-core';
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
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
}, (table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
}));