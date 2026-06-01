import {
  pgTable, serial, text, pgEnum, timestamp,
  integer
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const roleEnum     = pgEnum('role',      ['bat', 'bowl', 'all', 'wk']);
export const handEnum     = pgEnum('hand',      ['right', 'left']);
export const bowlTypeEnum = pgEnum('bowl_type', ['seam', 'spin']);

export const players = pgTable('players', {
  id:          serial('id').primaryKey(),
  userId:    integer('user_id')
             .notNull()
             .unique()                          // one player profile per account
             .references(() => users.id, { onDelete: 'cascade' }),

  // profile
  name:        text('name').notNull(),         // LKD display name
  bio:         text('bio'),
  imageUrl:    text('image_url'),
  videoUrl:    text('video_url'),                  // tiktok / short vid link

  // role
  role:        roleEnum('role').notNull(),
  batHand:     handEnum('bat_hand'),               // right / left

  // bowling (nullable — batters won't have these)
  bowlType:    bowlTypeEnum('bowl_type'),          // seam / spin
  bowlHand:    handEnum('bowl_hand'),

  // cards — 3 free text fields for now
  card1:       text('card1'),
  card2:       text('card2'),
  card3:       text('card3'),

  createdAt:   timestamp('created_at').defaultNow(),
});