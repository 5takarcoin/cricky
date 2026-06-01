import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { players } from './players.js';
import { teams }   from './teams.js';

export const playerTeams = pgTable('player_teams', {
  playerId: integer('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  teamId:   integer('team_id').notNull().references(() => teams.id,   { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.playerId, t.teamId] }),
}));