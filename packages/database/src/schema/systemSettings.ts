import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).unique().notNull(),
  settingValue: text('setting_value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});