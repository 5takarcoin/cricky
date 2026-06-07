import { db } from '../db/db.js';
import { deliveries } from '../db/schema/deliveries.js';
import { players } from '../db/schema/players.js';
import { eq, and, sql } from 'drizzle-orm';

// format legal ball count into overs string e.g. 63 balls = "10.3"
export const formatOvers = (legalBalls: number) => {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
};

// get all deliveries for a match
export const getDeliveries = async (matchId: number) => {
  return db
    .select()
    .from(deliveries)
    .where(eq(deliveries.matchId, matchId))
    .orderBy(deliveries.inning, deliveries.deliveryNumber);
};

// calculate innings score from deliveries
export const calcInningsScore = (dels: any[], inning: number) => {
  const inningDels = dels.filter(d => d.inning === inning);
  const runs       = inningDels.reduce((sum, d) => sum + d.runsFromBat + d.extraRuns, 0);
  const wickets    = inningDels.filter(d => d.wicketType !== null).length;
  const legalBalls = inningDels.filter(d => d.isLegalBall).length;
  const extras     = inningDels.reduce((sum, d) => sum + d.extraRuns, 0);

  return {
    runs,
    wickets,
    overs:  formatOvers(legalBalls),
    extras,
  };
};

// get batting figures per batsman for an innings
export const calcBattingFigures = async (dels: any[], inning: number) => {
  const inningDels  = dels.filter(d => d.inning === inning);
  const batterIds   = [...new Set(inningDels.map(d => d.strikerId).filter(Boolean))];

  return Promise.all(batterIds.map(async (batterId) => {
    const batterDels  = inningDels.filter(d => d.strikerId === batterId);
    const runs        = batterDels.reduce((sum, d) => sum + d.runsFromBat, 0);
    const balls       = batterDels.filter(d => d.isLegalBall).length;
    const fours       = batterDels.filter(d => d.runsFromBat === 4).length;
    const sixes       = batterDels.filter(d => d.runsFromBat === 6).length;
    const strikeRate  = balls > 0 ? Number(((runs / balls) * 100).toFixed(1)) : 0;
    const wicketDel   = inningDels.find(d => d.playerDismissedId === batterId);

    // get player name
    const [player] = await db
      .select({ name: players.name })
      .from(players)
      .where(eq(players.id, batterId));

    // build how out string
    let howOut = 'not out';
    let dismissedBy = null;

    if (wicketDel) {
      const [bowler]  = await db.select({ name: players.name }).from(players).where(eq(players.id, wicketDel.bowlerId));
      const fielder   = wicketDel.fielderId
        ? await db.select({ name: players.name }).from(players).where(eq(players.id, wicketDel.fielderId)).then(r => r[0])
        : null;

      switch (wicketDel.wicketType) {
        case 'bowled':    howOut = `b ${bowler?.name}`;                           break;
        case 'caught':    howOut = `c ${fielder?.name} b ${bowler?.name}`;        break;
        case 'lbw':       howOut = `lbw b ${bowler?.name}`;                       break;
        case 'run_out':   howOut = `run out (${fielder?.name})`;                  break;
        case 'stumped':   howOut = `st ${fielder?.name} b ${bowler?.name}`;       break;
        case 'hit_wicket': howOut = `hit wicket b ${bowler?.name}`;               break;
        default:          howOut = wicketDel.wicketType;
      }

      dismissedBy = { bowler: bowler?.name, fielder: fielder?.name ?? null };
    }

    return {
      batsman: { id: batterId, name: player?.name },
      runs, balls, fours, sixes, strikeRate,
      howOut, dismissedBy,
    };
  }));
};

// get bowling figures per bowler for an innings
export const calcBowlingFigures = async (dels: any[], inning: number) => {
  const inningDels = dels.filter(d => d.inning === inning);
  const bowlerIds  = [...new Set(inningDels.map(d => d.bowlerId).filter(Boolean))];

  return Promise.all(bowlerIds.map(async (bowlerId) => {
    const bowlerDels  = inningDels.filter(d => d.bowlerId === bowlerId);
    const legalBalls  = bowlerDels.filter(d => d.isLegalBall).length;
    const runs        = bowlerDels.reduce((sum, d) => sum + d.runsFromBat + d.extraRuns, 0);
    const wickets     = bowlerDels.filter(d => d.wicketType !== null).length;
    const overs       = formatOvers(legalBalls);
    const economy     = legalBalls > 0 ? Number(((runs / legalBalls) * 6).toFixed(1)) : 0;

    // calculate maidens — overs where 0 runs conceded
    let maidens = 0;
    for (let i = 0; i < Math.floor(legalBalls / 6); i++) {
      const overDels     = bowlerDels.filter(d => d.isLegalBall).slice(i * 6, (i + 1) * 6);
      const overRuns     = overDels.reduce((sum, d) => sum + d.runsFromBat + d.extraRuns, 0);
      if (overRuns === 0) maidens++;
    }

    const [player] = await db
      .select({ name: players.name })
      .from(players)
      .where(eq(players.id, bowlerId));

    return {
      bowler: { id: bowlerId, name: player?.name },
      overs, maidens, runs, wickets, economy,
    };
  }));
};