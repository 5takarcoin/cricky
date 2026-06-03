import * as z from "zod";

export const createTeamSchema = z.object({
  name:     z.string().min(2).max(50),
  logoUrl:  z.string().url().optional(),
  bio:      z.string().max(300).optional(),
  location: z.string().max(100).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;