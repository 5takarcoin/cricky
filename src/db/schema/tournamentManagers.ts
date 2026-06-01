import { pgTable, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { players } from './players.js';
import { tournaments } from './tournaments.js';

// handles creator + invited managers
export const tournamentManagers = pgTable('tournament_managers', {
  tournamentId: integer('tournament_id')
                .notNull()
                .references(() => tournaments.id, { onDelete: 'cascade' }),
  playerId:     integer('player_id')
                .notNull()
                .references(() => players.id, { onDelete: 'cascade' }),
  createdAt:    timestamp('created_at').defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.tournamentId, t.playerId] }),
}));