import {
  pgTable, integer, pgEnum,
  timestamp, primaryKey
} from 'drizzle-orm/pg-core';
import { tournaments } from './tournaments.js';
import { teams } from './teams.js';

export const teamTournamentStatusEnum = pgEnum('team_tournament_status', [
  'pending',    // invited, team hasn't responded yet
  'requested',  // team applied, manager hasn't approved yet
  'confirmed',  // in the tournament
  'rejected',   // declined or rejected
]);

export const tournamentTeams = pgTable('tournament_teams', {
  tournamentId: integer('tournament_id')
               .notNull()
               .references(() => tournaments.id, { onDelete: 'cascade' }),
  teamId:       integer('team_id')
               .notNull()
               .references(() => teams.id, { onDelete: 'cascade' }),
  status:       teamTournamentStatusEnum('status')
               .notNull()
               .default('requested'),
  createdAt:    timestamp('created_at').defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.tournamentId, t.teamId] }),
}));