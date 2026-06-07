import { calcInningsScore } from './scorecard.js';

type Del = {
  inning: number;
  over: number;
  ball: number;
  isLegalBall: boolean;
  wicketType: string | null;
};

export const getInningDeliveries = <T extends Del>(dels: T[], inning: number) =>
  dels.filter(d => d.inning === inning);

export const getNextBallPosition = (dels: Del[], inning: number) => {
  const innDels = getInningDeliveries(dels, inning);
  if (innDels.length === 0) return { over: 0, ball: 1 };

  const last = innDels[innDels.length - 1]!;
  if (!last.isLegalBall) {
    return { over: last.over, ball: last.ball };
  }
  if (last.ball >= 6) {
    return { over: last.over + 1, ball: 1 };
  }
  return { over: last.over, ball: last.ball + 1 };
};

export const isInningsComplete = (dels: Del[], inning: number, maxOvers: number) => {
  const innDels = getInningDeliveries(dels, inning);
  const wickets = innDels.filter(d => d.wicketType !== null).length;
  const legalBalls = innDels.filter(d => d.isLegalBall).length;
  return wickets >= 10 || legalBalls >= maxOvers * 6;
};

export const isMatchEnded = (dels: Del[], maxOvers: number) =>
  isInningsComplete(dels, 1, maxOvers) && isInningsComplete(dels, 2, maxOvers);

export const buildDeliveryResponse = (dels: Del[], inning: number, maxOvers: number) => {
  const inningsOver = isInningsComplete(dels, inning, maxOvers);
  const matchEnded  = isMatchEnded(dels, maxOvers);
  return {
    inningsOver,
    matchEnded,
    currentScore: calcInningsScore(dels, inning),
  };
};
