import { Router, type Request, type Response } from 'express';
import { db } from '../db/db.js';
import { tournaments } from '../db/schema/tournaments.js';
import { tournamentManagers } from '../db/schema/tournamentManagers.js';
import { tournamentTeams } from '../db/schema/tournamentTeams.js';
import { teams } from '../db/schema/teams.js';
import { players } from '../db/schema/players.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createTournamentSchema,
  approveTeamSchema,
} from '../validators/tournament.validator.js';
import type { AuthenticatedRequest } from '../types/authTypes.js';

const router = Router();

// ─── helper: check if user is a tournament manager ───────
const isManager = async (tournamentId: number, playerId: number) => {
  const [manager] = await db
    .select()
    .from(tournamentManagers)
    .where(
      and(
        eq(tournamentManagers.tournamentId, tournamentId),
        eq(tournamentManagers.playerId, playerId)
      )
    );
  return !!manager;
};

// ─── helper: get player from userId ──────────────────────
const getPlayer = async (userId: number) => {
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.userId, userId));
  return player;
};

// ─── CREATE TOURNAMENT ────────────────────────────────────
router.post('/',
  requireAuth,
  validate(createTournamentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const player = await getPlayer(req.user!.id);
      if (!player) {
        res.status(403).json({ error: 'Create a player profile first' });
        return;
      }

      const { tournament } = await db.transaction(async (tx) => {
        // create tournament
        const [tournament] = await tx
          .insert(tournaments)
          .values({ ...req.body, createdBy: player.id })
          .returning();
  
        if (!tournament) throw new Error('Failed to create tournament');

        // auto add creator as manager
        await tx.insert(tournamentManagers).values({
          tournamentId: tournament.id,
          playerId:     player.id,
        });

        return { tournament };
      });

      res.status(201).json(tournament);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  }
);

// ─── LIST ALL TOURNAMENTS ─────────────────────────────────
router.get('/',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const all = await db.select().from(tournaments);
      res.json(all);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  }
);

// ─── GET TOURNAMENT BY ID ─────────────────────────────────
router.get('/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId = Number(req.params.id);

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));

      if (!tournament) {
        res.status(404).json({ error: 'Tournament not found' });
        return;
      }

      // get confirmed teams
      const confirmedTeams = await db
        .select({
          id:      teams.id,
          name:    teams.name,
          logoUrl: teams.logoUrl,
        })
        .from(teams)
        .innerJoin(tournamentTeams, eq(tournamentTeams.teamId, teams.id))
        .where(
          and(
            eq(tournamentTeams.tournamentId, tournamentId),
            eq(tournamentTeams.status, 'confirmed')
          )
        );

      res.json({ ...tournament, teams: confirmedTeams });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  }
);

// ─── APPLY TO TOURNAMENT (team creator only) ──────────────
router.post('/:id/apply',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId = Number(req.params.id);
      const { teamId }   = req.body;
      const player       = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      // check tournament exists
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));

      if (!tournament) {
        res.status(404).json({ error: 'Tournament not found' });
        return;
      }

      // check user is team creator
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team || team.createdBy !== player.id) {
        res.status(403).json({ error: 'Only team creator can apply' });
        return;
      }

      // check not already applied
      const [existing] = await db
        .select()
        .from(tournamentTeams)
        .where(
          and(
            eq(tournamentTeams.tournamentId, tournamentId),
            eq(tournamentTeams.teamId, teamId)
          )
        );

      if (existing) {
        res.status(409).json({ error: 'Already applied to this tournament' });
        return;
      }

      // fc = auto confirm, application = requested
      const status = tournament.type === 'fc' ? 'confirmed' : 'requested';

      await db.insert(tournamentTeams).values({
        tournamentId,
        teamId,
        status,
      });

      res.status(201).json({
        message: status === 'confirmed'
          ? 'Joined tournament directly'
          : 'Application submitted, waiting for approval',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to apply to tournament' });
    }
  }
);

// ─── INVITE TEAM (manager only) ───────────────────────────
router.post('/:id/invite/:teamId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId = Number(req.params.id);
      const teamId       = Number(req.params.teamId);
      const player       = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      if (!(await isManager(tournamentId, player.id))) {
        res.status(403).json({ error: 'Only managers can invite teams' });
        return;
      }

      // check team exists
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      // check not already invited
      const [existing] = await db
        .select()
        .from(tournamentTeams)
        .where(
          and(
            eq(tournamentTeams.tournamentId, tournamentId),
            eq(tournamentTeams.teamId, teamId)
          )
        );

      if (existing) {
        res.status(409).json({ error: 'Team already invited or applied' });
        return;
      }

      await db.insert(tournamentTeams).values({
        tournamentId,
        teamId,
        status: 'pending', // team needs to accept
      });

      res.status(201).json({ message: 'Team invited' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to invite team' });
    }
  }
);

// ─── APPROVE / REJECT TEAM (manager only) ────────────────
router.put('/:id/teams/:teamId',
  requireAuth,
  validate(approveTeamSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId = Number(req.params.id);
      const teamId       = Number(req.params.teamId);
      const { status }   = req.body;
      const player       = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      if (!(await isManager(tournamentId, player.id))) {
        res.status(403).json({ error: 'Only managers can approve teams' });
        return;
      }

      const [updated] = await db
        .update(tournamentTeams)
        .set({ status })
        .where(
          and(
            eq(tournamentTeams.tournamentId, tournamentId),
            eq(tournamentTeams.teamId, teamId)
          )
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: 'Team application not found' });
        return;
      }

      res.json({ message: `Team ${status}`, updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update team status' });
    }
  }
);

// ─── ADD MANAGER ──────────────────────────────────────────
router.post('/:id/managers',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId  = Number(req.params.id);
      const { playerId }  = req.body;
      const player        = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      // only tournament creator can add managers
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));

      if (!tournament) {
        res.status(404).json({ error: 'Tournament not found' });
        return;
      }

      if (tournament.createdBy !== player.id) {
        res.status(403).json({ error: 'Only creator can add managers' });
        return;
      }

      await db.insert(tournamentManagers).values({
        tournamentId,
        playerId,
      });

      res.status(201).json({ message: 'Manager added' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add manager' });
    }
  }
);

// ─── REMOVE MANAGER ───────────────────────────────────────
router.delete('/:id/managers/:playerId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId = Number(req.params.id);
      const playerId     = Number(req.params.playerId);
      const player       = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));

      if (!tournament) {
        res.status(404).json({ error: 'Tournament not found' });
        return;
      }

      if (tournament.createdBy !== player.id) {
        res.status(403).json({ error: 'Only creator can remove managers' });
        return;
      }

      // prevent removing yourself as creator
      if (playerId === player.id) {
        res.status(400).json({ error: 'Creator cannot remove themselves' });
        return;
      }

      await db.delete(tournamentManagers)
        .where(
          and(
            eq(tournamentManagers.tournamentId, tournamentId),
            eq(tournamentManagers.playerId, playerId)
          )
        );

      res.json({ message: 'Manager removed' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to remove manager' });
    }
  }
);

export default router;