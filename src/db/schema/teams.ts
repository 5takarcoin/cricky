import {
  pgTable, serial, text, integer, timestamp
} from 'drizzle-orm/pg-core';
import { players } from './players.js';

export const teams = pgTable('teams', {
  id:          serial('id').primaryKey(),
  name:        text('name').notNull().unique(),
  logoUrl:     text('logo_url'),
  bio:         text('bio'),
  location:    text('location'),

  captainId:   integer('captain_id').references(() => players.id, { onDelete: 'set null' }),
  createdBy:   integer('created_by').notNull().references(() => players.id),

  createdAt:   timestamp('created_at').defaultNow(),
});