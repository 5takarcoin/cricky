import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const refreshTokens = pgTable('refresh_tokens', {
  id:        serial('id').primaryKey(),
  token:     text('token').notNull().unique(),
  userId:    integer('user_id')
             .notNull()
             .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});