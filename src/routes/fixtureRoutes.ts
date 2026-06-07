import { Router, type Request, type Response } from 'express';
import { db } from '../db/db.js';
import { matches } from '../db/schema/matches.js';
import { fixtures } from '../db/schema/fixtures.js';
import { tournamentTeams } from '../db/schema/tournamentTeams.js';
import { tournamentManagers } from '../db/schema/tournamentManagers.js';
import { teams } from '../db/schema/teams.js';
import { players } from '../db/schema/players.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  generateFixturesSchema,
  updateFixtureSchema,
} from '../validators/match.validator.js';
import type { AuthenticatedRequest } from '../types/authTypes.js';

const router = Router();

const getPlayer = async (userId: number) => {
  const [player] = await db.select().from(players).where(eq(players.userId, userId));
  return player;
};

const isManager = async (tournamentId: number, playerId: number) => {
  const [mgr] = await db
    .select()
    .from(tournamentManagers)
    .where(and(
      eq(tournamentManagers.tournamentId, tournamentId),
      eq(tournamentManagers.playerId, playerId)
    ));
  return !!mgr;
};

// ─── GENERATE ROUND ROBIN ─────────────────────────────────
router.post('/tournaments/:id/fixtures/generate',
  requireAuth,
  validate(generateFixturesSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tournamentId  = Number(req.params.id);
      const { startDate, matchesPerDay } = req.body;
      const player        = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      if (!(await isManager(tournamentId, player.id))) {
        res.status(403).json({ error: 'Only managers can generate fixtures' });
        return;
      }

      // get all confirmed teams
      const confirmedTeams = await db
        .select({ teamId: tournamentTeams.teamId })
        .from(tournamentTeams)
        .where(and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeams.status, 'confirmed')
        ));

      if (confirmedTeams.length < 2) {
        res.status(400).json({ error: 'Need at least 2 confirmed teams' });
        return;
      }

      const teamIds = confirmedTeams.map(t => t.teamId);

      // generate all pairs (round robin)
      const pairs: { team1Id: number; team2Id: number }[] = [];
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          if (teamIds[i] === undefined || teamIds[j] === undefined) continue; // eslint-disable-line
            const team1Id = teamIds[i];
            const team2Id = teamIds[j];
            if (team1Id === undefined || team2Id === undefined) continue;
            pairs.push({ team1Id, team2Id });
        }
      }

      // assign scheduled dates
      const start = new Date(startDate);
      const createdMatches = await db.transaction(async (tx) => {
        const results = [];

        for (let i = 0; i < pairs.length; i++) {
          const dayOffset    = Math.floor(i / matchesPerDay);
          const matchOnDay   = i % matchesPerDay;
          const scheduledAt  = new Date(start);
          scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
          scheduledAt.setHours(10 + matchOnDay * 4); // 10am, 2pm, 6pm etc

          const pair = pairs[i];
          if (!pair) continue;
          const [match] = await tx
            .insert(matches)
            .values({
              tournamentId,
              team1Id: pair.team1Id,
              team2Id: pair.team2Id,
              scheduledAt,
            })
            .returning();

          if (!match) throw new Error('Insert did not return match');

          await tx.insert(fixtures).values({
            tournamentId,
            matchId:    match.id,
            scheduledAt,
          });

          results.push(match);
        }

        return results;
      });

      res.status(201).json({
        message:  `${createdMatches.length} matches generated`,
        matches:  createdMatches,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate fixtures' });
    }
  }
);

// ─── GET TOURNAMENT FIXTURES ──────────────────────────────
router.get('/tournaments/:id/fixtures',
  async (req: Request, res: Response) => {
    try {
      const tournamentId = Number(req.params.id);

      const allFixtures = await db
        .select()
        .from(fixtures)
        .where(eq(fixtures.tournamentId, tournamentId));

      // attach team names to each fixture
      const enriched = await Promise.all(allFixtures.map(async (f) => {
        const [match] = await db.select().from(matches).where(eq(matches.id, f.matchId));
        if (!match) return null;
        const [team1] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, match.team1Id));
        const [team2] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, match.team2Id));
        return { ...f, team1, team2, status: match.status, result: match.result };
      }));

      res.json(enriched.filter(Boolean));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch fixtures' });
    }
  }
);

// ─── UPDATE FIXTURE ───────────────────────────────────────
router.put('/fixtures/:id',
  requireAuth,
  validate(updateFixtureSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const fixtureId = Number(req.params.id);
      const player    = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const [fixture] = await db
        .select()
        .from(fixtures)
        .where(eq(fixtures.id, fixtureId));

      if (!fixture) {
        res.status(404).json({ error: 'Fixture not found' });
        return;
      }

      if (!(await isManager(fixture.tournamentId, player.id))) {
        res.status(403).json({ error: 'Only managers can update fixtures' });
        return;
      }

      const { scheduledAt, venue } = req.body;
      const fixtureUpdates: { scheduledAt?: Date; venue?: string } = {};
      if (venue !== undefined) fixtureUpdates.venue = venue;
      if (scheduledAt !== undefined) fixtureUpdates.scheduledAt = new Date(scheduledAt);

      const [updated] = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(fixtures)
          .set(fixtureUpdates)
          .where(eq(fixtures.id, fixtureId))
          .returning();

        if (!row) throw new Error('Fixture update failed');

        if (scheduledAt !== undefined) {
          await tx
            .update(matches)
            .set({ scheduledAt: new Date(scheduledAt) })
            .where(eq(matches.id, row.matchId));
        }

        return [row];
      });

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update fixture' });
    }
  }
);

export default router;