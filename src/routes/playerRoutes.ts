import { Router, type Request, type Response } from 'express';
import { db } from '../db/db.js';
import { players } from '../db/schema/players.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createPlayerSchema,
  updatePlayerSchema
} from '../validators/player.validator.js';
import type { AuthenticatedRequest } from '../types/authTypes.js';

const router = Router();

// POST /players/me — create my player profile
router.post('/me',
  requireAuth,
  validate(createPlayerSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // check if profile already exists
      const [existing] = await db
        .select()
        .from(players)
        .where(eq(players.userId, userId));

      if (existing) {
        res.status(409).json({ error: 'Player profile already exists' });
        return;
      }

      const [player] = await db
        .insert(players)
        .values({ ...req.body, userId })
        .returning();

      res.status(201).json(player);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create player profile' });
    }
  }
);

// GET /players/me — get my profile
router.get('/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.userId, req.user!.id));

      if (!player) {
        res.status(404).json({ error: 'Player profile not found' });
        return;
      }

      res.json(player);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

// GET /players/:id — get any player (public)
router.get('/:id',
  async (req: Request, res: Response) => {
    try {
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, Number(req.params.id)));

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      res.json(player);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch player' });
    }
  }
);

// PUT /players/me — update my profile
router.put('/me',
  requireAuth,
  validate(updatePlayerSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [player] = await db
        .update(players)
        .set(req.body)
        .where(eq(players.userId, req.user!.id))
        .returning();

      if (!player) {
        res.status(404).json({ error: 'Player profile not found' });
        return;
      }

      res.json(player);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;