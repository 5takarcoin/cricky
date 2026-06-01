import {
  pgTable, serial, integer,
  boolean, text, pgEnum, timestamp
} from 'drizzle-orm/pg-core';
import { matches } from './matches.js';
import { players } from './players.js';

export const extraTypeEnum = pgEnum('extra_type', [
  'none',
  'wide',
  'no_ball',
  'bye',
  'leg_bye',
  'penalty',
]);

export const wicketTypeEnum = pgEnum('wicket_type', [
  'bowled',
  'caught',
  'lbw',
  'run_out',
  'stumped',
  'hit_wicket',
  'obstructing',
  'timed_out',
  'handled_ball',
]);

export const deliveries = pgTable('deliveries', {
  id:             serial('id').primaryKey(),
  matchId:        integer('match_id')
                 .notNull()
                 .references(() => matches.id, { onDelete: 'cascade' }),

  // position
  deliveryNumber: integer('delivery_number').notNull(), // sort order, increments every ball incl. wides/noballs
  inning:         integer('inning').notNull(),          // 1 or 2
  over:           integer('over').notNull(),            // 0-indexed
  ball:           integer('ball').notNull(),            // legal ball count only (1-6)

  // players
  strikerId:      integer('striker_id')
                 .references(() => players.id),
  nonStrikerId:   integer('non_striker_id')
                 .references(() => players.id),
  bowlerId:       integer('bowler_id')
                 .references(() => players.id),

  // runs
  runsFromBat:    integer('runs_from_bat').notNull().default(0),
  extraRuns:      integer('extra_runs').notNull().default(0),
  extraType:      extraTypeEnum('extra_type').notNull().default('none'),
  isLegalBall:    boolean('is_legal_ball').notNull().default(true),

  // wicket — all nullable, null means no wicket this ball
  wicketType:       wicketTypeEnum('wicket_type'),
  playerDismissedId: integer('player_dismissed_id')
                    .references(() => players.id),
  fielderId:        integer('fielder_id')
                   .references(() => players.id),       // null for bowled/lbw
  nextBatterId:     integer('next_batter_id')
                   .references(() => players.id),       // null if innings over

  // optional
  commentary:     text('commentary'),
  timestamp:      timestamp('timestamp').defaultNow(),
});