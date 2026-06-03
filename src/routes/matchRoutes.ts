import { Router, type Request, type Response } from 'express';
import { db } from '../db/db.js';
import { matches } from '../db/schema/matches.js';
import { teams } from '../db/schema/teams.js';
import { tournaments } from '../db/schema/tournaments.js';
import { tournamentManagers } from '../db/schema/tournamentManagers.js';
import { tournamentTeams } from '../db/schema/tournamentTeams.js';
import { fixtures } from '../db/schema/fixtures.js';
import { players } from '../db/schema/players.js';
import { deliveries } from '../db/schema/deliveries.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createMatchSchema,
  updateStatusSchema,
  updateResultSchema,
  generateFixturesSchema,
  updateFixtureSchema,
} from '../validators/match.validator.js';
import {
  getDeliveries,
  calcInningsScore,
  calcBattingFigures,
  calcBowlingFigures,
  formatOvers,
} from '../lib/scorecard.js';
import type { AuthenticatedRequest } from '../types/authTypes.js';

const router = Router();

// ─── helper: get player from userId ──────────────────────
const getPlayer = async (userId: number) => {
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.userId, userId));
  return player;
};

// ─── helper: check if user is tournament manager ──────────
const isManager = async (tournamentId: number, playerId: number) => {
  const [mgr] = await db
    .select()
    .from(tournamentManagers)
    .where(
      and(
        eq(tournamentManagers.tournamentId, tournamentId),
        eq(tournamentManagers.playerId, playerId)
      )
    );
  return !!mgr;
};

// ─── CREATE MATCH ─────────────────────────────────────────
router.post('/',
  requireAuth,
  validate(createMatchSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const player = await getPlayer(req.user!.id);
      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const { tournamentId, team1Id, team2Id, scheduledAt } = req.body;

      if (!(await isManager(tournamentId, player.id))) {
        res.status(403).json({ error: 'Only tournament managers can create matches' });
        return;
      }

      // both teams must be confirmed in tournament
      const confirmedTeams = await db
        .select()
        .from(tournamentTeams)
        .where(
          and(
            eq(tournamentTeams.tournamentId, tournamentId),
            eq(tournamentTeams.status, 'confirmed')
          )
        );

      const confirmedIds = confirmedTeams.map(t => t.teamId);
      if (!confirmedIds.includes(team1Id) || !confirmedIds.includes(team2Id)) {
        res.status(400).json({ error: 'Both teams must be confirmed in the tournament' });
        return;
      }

      const [match] = await db
        .insert(matches)
        .values({ tournamentId, team1Id, team2Id, scheduledAt })
        .returning();

      res.status(201).json(match);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create match' });
    }
  }
);

// ─── GET MATCH ────────────────────────────────────────────
router.get('/:id',
  async (req: Request, res: Response) => {
    try {
      const matchId = Number(req.params.id);

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId));

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      const [team1] = await db.select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
        .from(teams).where(eq(teams.id, match.team1Id));
      const [team2] = await db.select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
        .from(teams).where(eq(teams.id, match.team2Id));

      res.json({ ...match, team1, team2 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch match' });
    }
  }
);

// ─── UPDATE STATUS ────────────────────────────────────────
router.put('/:id/status',
  requireAuth,
  validate(updateStatusSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const matchId = Number(req.params.id);
      const { status } = req.body;
      const player  = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId));

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (!(await isManager(match.tournamentId, player.id))) {
        res.status(403).json({ error: 'Only managers can update match status' });
        return;
      }

      // enforce valid transitions
      const validTransitions: Record<string, string[]> = {
        scheduled: ['live'],
        live:      ['ended'],
        ended:     [],
      };

      if (!validTransitions[match.status ?? '' as string]?.includes(status)) {
        res.status(400).json({
          error: `Cannot transition from ${match.status} to ${status}`
        });
        return;
      }

      const [updated] = await db
        .update(matches)
        .set({ status })
        .where(eq(matches.id, matchId))
        .returning();

      res.json({
        message: status === 'live' ? 'Match is now live' : 'Match ended',
        status:  updated?.status ?? match.status,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

// ─── SET RESULT ───────────────────────────────────────────
router.put('/:id/result',
  requireAuth,
  validate(updateResultSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const matchId    = Number(req.params.id);
      const { result } = req.body;
      const player     = await getPlayer(req.user!.id);

      if (!player) {
        res.status(403).json({ error: 'Player profile not found' });
        return;
      }

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId));

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (match.status !== 'ended') {
        res.status(400).json({ error: 'Match must be ended before setting result' });
        return;
      }

      if (!(await isManager(match.tournamentId, player.id))) {
        res.status(403).json({ error: 'Only managers can set result' });
        return;
      }

      const [updated] = await db
        .update(matches)
        .set({ result })
        .where(eq(matches.id, matchId))
        .returning();

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to set result' });
    }
  }
);

// ─── MATCH SUMMARY ────────────────────────────────────────
router.get('/:id/summary',
  async (req: Request, res: Response) => {
    try {
      const matchId = Number(req.params.id);

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId));

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      const dels = await getDeliveries(matchId);

      // if scheduled — no deliveries yet
      if (match.status === 'scheduled') {
        res.json({ status: 'scheduled', scheduledAt: match.scheduledAt });
        return;
      }

      // if live — show current innings summary
      if (match.status === 'live') {
        const lastDel     = dels[dels.length - 1];
        const currentInning = lastDel?.inning ?? 1;
        const score       = calcInningsScore(dels, currentInning);

        // current batsmen = striker + non striker of last delivery
        const [striker]    = await db.select({ id: players.id, name: players.name })
          .from(players).where(eq(players.id, lastDel?.strikerId ?? 0 as number));
        const [nonStriker] = await db.select({ id: players.id, name: players.name })
          .from(players).where(eq(players.id, lastDel?.nonStrikerId ?? 0 as number));
        const [bowler]     = await db.select({ id: players.id, name: players.name })
          .from(players).where(eq(players.id, lastDel?.bowlerId ?? 0 as number));

        // current bowler stats this spell
        const bowlerDels   = dels.filter(d => d.inning === currentInning && d.bowlerId === lastDel?.bowlerId);
        const bowlerRuns   = bowlerDels.reduce((sum, d) => sum + d.runsFromBat + d.extraRuns, 0);
        const bowlerBalls  = bowlerDels.filter(d => d.isLegalBall).length;
        const bowlerWickets = bowlerDels.filter(d => d.wicketType !== null).length;

        // current striker stats
        const strikerDels  = dels.filter(d => d.inning === currentInning && d.strikerId === lastDel?.strikerId);
        const strikerRuns  = strikerDels.reduce((sum, d) => sum + d.runsFromBat, 0);
        const strikerBalls = strikerDels.filter(d => d.isLegalBall).length;

        // non striker stats
        const nonStrikerDels  = dels.filter(d => d.inning === currentInning && d.strikerId === lastDel?.nonStrikerId);
        const nonStrikerRuns  = nonStrikerDels.reduce((sum, d) => sum + d.runsFromBat, 0);
        const nonStrikerBalls = nonStrikerDels.filter(d => d.isLegalBall).length;

        res.json({
          status: 'live',
          inning: currentInning,
          score,
          currentBatsmen: [
            { ...striker,    runs: strikerRuns,    balls: strikerBalls },
            { ...nonStriker, runs: nonStrikerRuns, balls: nonStrikerBalls },
          ],
          currentBowler: {
            ...bowler,
            overs:   formatOvers(bowlerBalls),
            runs:    bowlerRuns,
            wickets: bowlerWickets,
          },
        });
        return;
      }

      // if ended — show both innings scores + winner
      const [team1] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, match.team1Id));
      const [team2] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, match.team2Id));

      const innings = await Promise.all([1, 2].map(async (inning) => {
        const innDels = dels.filter(d => d.inning === inning);
        if (innDels.length === 0) return null;
        return {
          inning,
          team:  inning === 1 ? team1 : team2,
          score: calcInningsScore(dels, inning),
        };
      }));

      const winner = match.result === 'team1_win' ? team1
                   : match.result === 'team2_win' ? team2
                   : null;

      res.json({
        status: 'ended',
        result: match.result,
        winner,
        innings: innings.filter(Boolean),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  }
);

// ─── FULL SCORECARD ───────────────────────────────────────
router.get('/:id/scorecard',
  async (req: Request, res: Response) => {
    try {
      const matchId = Number(req.params.id);

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId));

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      const [team1] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, match.team1Id));
      const [team2] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, match.team2Id));

      const dels = await getDeliveries(matchId);

      const innings = await Promise.all([1, 2].map(async (inning) => {
        const innDels = dels.filter(d => d.inning === inning);
        if (innDels.length === 0) return null;

        const [batting, bowling] = await Promise.all([
          calcBattingFigures(dels, inning),
          calcBowlingFigures(dels, inning),
        ]);

        return {
          inning,
          team:    inning === 1 ? team1 : team2,
          score:   calcInningsScore(dels, inning),
          batting,
          bowling,
        };
      }));

      res.json({
        match: { ...match, team1, team2 },
        innings: innings.filter(Boolean),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch scorecard' });
    }
  }
);

export default router;