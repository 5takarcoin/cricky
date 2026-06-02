import * as z from "zod";

export const createPlayerSchema = z.object({
  name:     z.string().min(1).max(50),
  bio:      z.string().max(300).optional(),
  imageUrl: z.url('Must be a valid URL').optional(),
  videoUrl: z.url('Must be a valid URL').optional(),
  role:     z.enum(['bat', 'bowl', 'all', 'wk']),
  batHand:  z.enum(['right', 'left']).optional(),
  bowlType: z.enum(['seam', 'spin']).optional(),
  bowlHand: z.enum(['right', 'left']).optional(),
  card1:    z.string().max(100).optional(),
  card2:    z.string().max(100).optional(),
  card3:    z.string().max(100).optional(),
}).refine((data) => {
  if (['bowl', 'all'].includes(data.role) && !data.bowlType) {
    return false;
  }
  return true;
}, { message: 'bowlType is required for bowlers and all-rounders' });

export const updatePlayerSchema = z.object(createPlayerSchema.shape).partial();

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;