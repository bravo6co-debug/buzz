import { pgTable, serial, varchar, text, json, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const regionalContents = pgTable('regional_contents', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  images: json('images'),
  contentType: varchar('content_type', { length: 50 }), // tour_course, photo_spot, seasonal_special
  isFeatured: boolean('is_featured').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});