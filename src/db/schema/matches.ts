import {
  pgTable, serial, integer,
  timestamp, pgEnum
} from 'drizzle-orm/pg-core';
import { tournaments } from './tournaments.js';
import { teams } from './teams.js';

export const matchResultEnum = pgEnum('match_result', [
  'team1_win',
  'team2_win',
  'tie',
  'no_result',
  'pending',
]);

export const matchStatusEnum = pgEnum('match_status', [
  'scheduled',
  'live',
  'ended',
]);

export const matches = pgTable('matches', {
  id:           serial('id').primaryKey(),
  tournamentId: integer('tournament_id')
               .notNull()
               .references(() => tournaments.id, { onDelete: 'cascade' }),
  team1Id:      integer('team1_id')
               .notNull()
               .references(() => teams.id),
  team2Id:      integer('team2_id')
               .notNull()
               .references(() => teams.id),
  result:       matchResultEnum('result').default('pending'),
  status:       matchStatusEnum('status').default('scheduled'),
  scheduledAt:  timestamp('scheduled_at'),
  createdAt:    timestamp('created_at').defaultNow(),
});