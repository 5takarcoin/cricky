import { Router, type Request, type Response } from 'express';
import { db } from '../db/db.js';
import { teams } from '../db/schema/teams.js';
import { playerTeams } from '../db/schema/playerTeams.js';
import { players } from '../db/schema/players.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { createTeamSchema, updateTeamSchema } from '../validators/team.validator.js';
import type { AuthenticatedRequest } from '../types/authTypes.js';

const router = Router();

// ─── CREATE TEAM ─────────────────────────────────────────
router.post('/',
  requireAuth,
  validate(createTeamSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // user must have a player profile to create a team
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.userId, userId));

      if (!player) {
        res.status(403).json({ error: 'Create a player profile first' });
        return;
      }

      const [team] = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(teams)
          .values({ ...req.body, createdBy: player.id })
          .returning();

        if (!created) throw new Error('Failed to create team');

        await tx.insert(playerTeams).values({
          teamId:   created.id,
          playerId: player.id,
        });

        return [created];
      });

      res.status(201).json(team);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create team' });
    }
  }
);

// ─── GET MY TEAMS ─────────────────────────────────────────
router.get('/my',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.userId, userId));

      if (!player) {
        res.status(404).json({ error: 'Player profile not found' });
        return;
      }

      // get all teams this player is in via join table
      const myTeams = await db
        .select({
          id:       teams.id,
          name:     teams.name,
          logoUrl:  teams.logoUrl,
          location: teams.location,
        })
        .from(teams)
        .innerJoin(playerTeams, eq(playerTeams.teamId, teams.id))
        .where(eq(playerTeams.playerId, player.id));

      res.json(myTeams);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  }
);

// ─── GET TEAM BY ID ───────────────────────────────────────
router.get('/:id',
  async (req: Request, res: Response) => {
    try {
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, Number(req.params.id)));

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      // get all players in this team
      const members = await db
        .select({
          id:      players.id,
          name:    players.name,
          role:    players.role,
          imageUrl: players.imageUrl,
        })
        .from(players)
        .innerJoin(playerTeams, eq(playerTeams.playerId, players.id))
        .where(eq(playerTeams.teamId, team.id));

      res.json({ ...team, members });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  }
);

// ─── ADD PLAYER TO TEAM ───────────────────────────────────
router.post('/:id/players',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId   = req.user!.id;
      const teamId   = Number(req.params.id);
      const { playerId } = req.body;

      // get requesting user's player profile
      const [myPlayer] = await db
        .select()
        .from(players)
        .where(eq(players.userId, userId));

      if (!myPlayer) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      // only creator can add players
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      if (team.createdBy !== myPlayer.id) {
        res.status(403).json({ error: 'Only the team creator can add players' });
        return;
      }

      // check player not already in team
      const [existing] = await db
        .select()
        .from(playerTeams)
        .where(
          and(
            eq(playerTeams.teamId, teamId),
            eq(playerTeams.playerId, playerId)
          )
        );

      if (existing) {
        res.status(409).json({ error: 'Player already in team' });
        return;
      }

      await db.insert(playerTeams).values({ teamId, playerId });

      res.status(201).json({ message: 'Player added to team' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add player' });
    }
  }
);

// ─── REMOVE PLAYER FROM TEAM ──────────────────────────────
router.delete('/:id/players/:playerId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId   = req.user!.id;
      const teamId   = Number(req.params.id);
      const playerId = Number(req.params.playerId);

      const [myPlayer] = await db
        .select()
        .from(players)
        .where(eq(players.userId, userId));

      if (!myPlayer) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      if (team.createdBy !== myPlayer.id) {
        res.status(403).json({ error: 'Only the team creator can remove players' });
        return;
      }

      await db.delete(playerTeams)
        .where(
          and(
            eq(playerTeams.teamId, teamId),
            eq(playerTeams.playerId, playerId)
          )
        );

      res.json({ message: 'Player removed from team' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to remove player' });
    }
  }
);

// ─── ASSIGN CAPTAIN ───────────────────────────────────────
router.put('/:id/captain',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId   = req.user!.id;
      const teamId   = Number(req.params.id);
      const { playerId } = req.body;

      const [myPlayer] = await db
        .select()
        .from(players)
        .where(eq(players.userId, userId));

      if (!myPlayer) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      if (team.createdBy !== myPlayer.id) {
        res.status(403).json({ error: 'Only the team creator can assign captain' });
        return;
      }

      // make sure the new captain is actually in the team
      const [member] = await db
        .select()
        .from(playerTeams)
        .where(
          and(
            eq(playerTeams.teamId, teamId),
            eq(playerTeams.playerId, playerId)
          )
        );

      if (!member) {
        res.status(400).json({ error: 'Player is not in this team' });
        return;
      }

      const [updated] = await db
        .update(teams)
        .set({ captainId: playerId })
        .where(eq(teams.id, teamId))
        .returning();

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to assign captain' });
    }
  }
);

export default router;