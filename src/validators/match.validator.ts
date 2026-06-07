import * as z from "zod";

export const createMatchSchema = z.object({
  tournamentId: z.number().int(),
  team1Id:      z.number().int(),
  team2Id:      z.number().int(),
  scheduledAt:  z.string().datetime().optional(),
}).refine(d => d.team1Id !== d.team2Id, {
  message: 'A team cannot play against itself',
});

export const updateStatusSchema = z.object({
  status: z.enum(['live', 'ended']),
});

const wicketTypes = [
  'bowled', 'caught', 'lbw', 'run_out', 'stumped',
  'hit_wicket', 'obstructing', 'timed_out', 'handled_ball',
] as const;

export const createDeliverySchema = z.object({
  inning:         z.number().int().min(1).max(2),
  over:           z.number().int().min(0).optional(),
  ball:           z.number().int().min(1).max(6).optional(),
  strikerId:      z.number().int(),
  nonStrikerId:   z.number().int(),
  bowlerId:       z.number().int(),
  runsFromBat:    z.number().int().min(0).default(0),
  extraRuns:      z.number().int().min(0).default(0),
  extraType:      z.enum(['none', 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty']).default('none'),
  isLegalBall:    z.boolean().default(true),
  isWicket:       z.boolean().optional(),
  wicketType:     z.enum(wicketTypes).optional(),
  playerDismissedId: z.number().int().optional(),
  fielderId:      z.number().int().optional(),
  nextBatterId:   z.number().int().optional(),
  commentary:     z.string().max(500).optional(),
}).refine(d => !d.isWicket || d.wicketType, {
  message: 'wicketType is required when isWicket is true',
});

export const updateResultSchema = z.object({
  result: z.enum(['team1_win', 'team2_win', 'tie', 'no_result']),
});

export const generateFixturesSchema = z.object({
  startDate:     z.string().datetime(),
  matchesPerDay: z.number().int().min(1).max(10).default(2),
});

export const updateFixtureSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  venue:       z.string().max(100).optional(),
});

export type CreateMatchInput      = z.infer<typeof createMatchSchema>;
export type GenerateFixturesInput = z.infer<typeof generateFixturesSchema>;