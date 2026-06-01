import { pgTable, serial, text, pgEnum, timestamp } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'player',
  'manager',
  'both',
]);

export const users = pgTable('users', {
  id:           serial('id').primaryKey(),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role:         userRoleEnum('role').notNull().default('player'),
  createdAt:    timestamp('created_at').defaultNow(),
});