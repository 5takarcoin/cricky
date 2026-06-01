import {
  pgTable, serial, text, integer,
  pgEnum, timestamp
} from 'drizzle-orm/pg-core';
import { players } from './players.js';

export const tournamentTypeEnum = pgEnum('tournament_type', [
  'invite',       // manager invites teams
  'fc',           // free join, auto accepted
  'application',  // teams apply, manager approves
]);

export const tournaments = pgTable('tournaments', {
  id:          serial('id').primaryKey(),
  name:        text('name').notNull(),
  venue:       text('venue'),
  overs:       integer('overs').notNull(),
  type:        tournamentTypeEnum('type').notNull(),
  description: text('description'),
  rules:       text('rules'),
  createdBy:   integer('created_by')
               .notNull()
               .references(() => players.id),
  createdAt:   timestamp('created_at').defaultNow(),
});