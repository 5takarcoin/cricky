import type { Delivery, InningsScore } from '../types';

export type ExtraType = 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye';

export interface DeliveryPayload {
  inning: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
  runsFromBat: number;
  extraRuns: number;
  extraType: ExtraType;
  isLegalBall: boolean;
  isWicket?: boolean;
  wicketType?: string | null;
  playerDismissedId?: number | null;
  fielderId?: number | null;
  nextBatterId?: number | null;
  commentary?: string | null;
}

export function buildRunPayload(
  runs: number,
  ctx: { inning: number; strikerId: number; nonStrikerId: number; bowlerId: number },
): DeliveryPayload {
  return {
    ...ctx,
    runsFromBat: runs,
    extraRuns: 0,
    extraType: 'none',
    isLegalBall: true,
    isWicket: false,
  };
}

export function buildExtraPayload(
  extraType: ExtraType,
  extraRuns: number,
  runsFromBat: number,
  ctx: { inning: number; strikerId: number; nonStrikerId: number; bowlerId: number },
): DeliveryPayload {
  const isLegalBall = extraType !== 'wide' && extraType !== 'no_ball';
  return {
    ...ctx,
    runsFromBat,
    extraRuns,
    extraType,
    isLegalBall,
    isWicket: false,
  };
}

export function buildWicketPayload(
  ctx: { inning: number; strikerId: number; nonStrikerId: number; bowlerId: number },
  details: {
    wicketType: string;
    playerDismissedId: number;
    fielderId?: number | null;
    nextBatterId: number;
    runsFromBat?: number;
  },
): DeliveryPayload {
  return {
    ...ctx,
    runsFromBat: details.runsFromBat ?? 0,
    extraRuns: 0,
    extraType: 'none',
    isLegalBall: true,
    isWicket: true,
    wicketType: details.wicketType,
    playerDismissedId: details.playerDismissedId,
    fielderId: details.fielderId ?? null,
    nextBatterId: details.nextBatterId,
  };
}

/** Strike rotation after a legal delivery (frontend responsibility per spec). */
export function rotateStrike(
  strikerId: number,
  nonStrikerId: number,
  runsFromBat: number,
  isLegalBall: boolean,
  deliveryBall: number,
): { strikerId: number; nonStrikerId: number; endOfOver: boolean } {
  let striker = strikerId;
  let nonStriker = nonStrikerId;
  let endOfOver = false;

  if (isLegalBall) {
    if (runsFromBat === 1 || runsFromBat === 3) {
      [striker, nonStriker] = [nonStriker, striker];
    }
    if (deliveryBall >= 6) {
      [striker, nonStriker] = [nonStriker, striker];
      endOfOver = true;
    }
  }

  return { strikerId: striker, nonStrikerId: nonStriker, endOfOver };
}

export function rotateStrikeAfterWicket(
  strikerId: number,
  nonStrikerId: number,
  dismissedId: number,
  nextBatterId: number,
  runsFromBat: number,
  deliveryBall: number,
): { strikerId: number; nonStrikerId: number; endOfOver: boolean } {
  let striker = strikerId;
  let nonStriker = nonStrikerId;

  if (dismissedId === striker) {
    striker = nextBatterId;
  } else {
    nonStriker = nextBatterId;
  }

  let endOfOver = false;
  if (runsFromBat === 1 || runsFromBat === 3) {
    [striker, nonStriker] = [nonStriker, striker];
  }
  if (deliveryBall >= 6) {
    [striker, nonStriker] = [nonStriker, striker];
    endOfOver = true;
  }

  return { strikerId: striker, nonStrikerId: nonStriker, endOfOver };
}

export function ballDisplaySymbol(d: Pick<Delivery, 'runsFromBat' | 'extraType' | 'wicketType' | 'isLegalBall'>): string {
  if (d.wicketType) return 'W';
  if (d.extraType === 'wide') return 'Wd';
  if (d.extraType === 'no_ball') return 'Nb';
  if (d.runsFromBat === 0) return '.';
  if (d.runsFromBat === 4) return '4';
  if (d.runsFromBat === 6) return '6';
  return String(d.runsFromBat);
}

import type { Team } from '../types';

export type SquadPlayer = { id: number; name: string };

export function battingTeamId(inning: number, team1Id: number, team2Id: number) {
  return inning === 1 ? team1Id : team2Id;
}

export function bowlingTeamId(inning: number, team1Id: number, team2Id: number) {
  return inning === 1 ? team2Id : team1Id;
}

export type ScoreboardState = {
  inning: number;
  score: InningsScore;
};

export function toSquad(t: Team): SquadPlayer[] {
  return (t.members ?? []).map((m) => ({ id: m.id, name: m.name }));
}

export function squadsForInning(inning: number, team1: Team, team2: Team) {
  const batId = battingTeamId(inning, team1.id, team2.id);
  const bowlId = bowlingTeamId(inning, team1.id, team2.id);
  return {
    batting: batId === team1.id ? toSquad(team1) : toSquad(team2),
    bowling: bowlId === team1.id ? toSquad(team1) : toSquad(team2),
  };
}
