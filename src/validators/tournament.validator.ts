import * as z from "zod";

export const createTournamentSchema = z.object({
  name:        z.string().min(2).max(100),
  venue:       z.string().max(100).optional(),
  overs:       z.number().int().min(1).max(50),
  type:        z.enum(['invite', 'fc', 'application']),
  description: z.string().max(500).optional(),
  rules:       z.string().max(1000).optional(),
});

export const updateTournamentSchema = createTournamentSchema.partial();

export const approveTeamSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;