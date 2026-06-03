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
  status: z.enum(['scheduled', 'live', 'ended']),
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