import {
  pgTable, serial, integer, timestamp,
  text
} from 'drizzle-orm/pg-core';
import { tournaments } from './tournaments.js';
import { matches } from './matches.js';

export const fixtures = pgTable('fixtures', {
  id:           serial('id').primaryKey(),
  tournamentId: integer('tournament_id')
               .notNull()
               .references(() => tournaments.id, { onDelete: 'cascade' }),
  matchId:      integer('match_id')
               .notNull()
               .references(() => matches.id, { onDelete: 'cascade' }),
  scheduledAt:  timestamp('scheduled_at').notNull(),
  venue:        text('venue'),                     // can override tournament venue
  updatedAt:    timestamp('updated_at').defaultNow(),
});