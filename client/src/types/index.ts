export interface User {
  id: number;
  username: string;
  role?: string;
}

export interface Player {
  id: number;
  userId: number;
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
  role: 'bat' | 'bowl' | 'all' | 'wk';
  batHand?: string | null;
  bowlType?: string | null;
  bowlHand?: string | null;
}

export interface Team {
  id: number;
  name: string;
  logoUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  captainId?: number | null;
  createdBy: number;
  members?: { id: number; name: string; role: string; imageUrl?: string | null }[];
}

export interface Tournament {
  id: number;
  name: string;
  venue?: string | null;
  overs: number;
  type: 'invite' | 'fc' | 'application';
  description?: string | null;
  createdBy: number;
  teams?: { id: number; name: string; logoUrl?: string | null }[];
}

export interface Match {
  id: number;
  tournamentId: number;
  team1Id: number;
  team2Id: number;
  status: 'scheduled' | 'live' | 'ended';
  result: string;
  scheduledAt?: string | null;
  team1?: { id: number; name: string; logoUrl?: string | null };
  team2?: { id: number; name: string; logoUrl?: string | null };
}

export interface Fixture {
  id: number;
  tournamentId: number;
  matchId: number;
  scheduledAt: string;
  venue?: string | null;
  team1?: { id: number; name: string };
  team2?: { id: number; name: string };
  status?: string;
  result?: string;
}

export interface InningsScore {
  runs: number;
  wickets: number;
  overs: string;
  extras?: number;
}

export interface Delivery {
  id: number;
  matchId: number;
  deliveryNumber: number;
  inning: number;
  over: number;
  ball: number;
  strikerId?: number | null;
  nonStrikerId?: number | null;
  bowlerId?: number | null;
  runsFromBat: number;
  extraRuns: number;
  extraType: string;
  isLegalBall: boolean;
  wicketType?: string | null;
  isWicket?: boolean;
  playerDismissedId?: number | null;
  fielderId?: number | null;
  nextBatterId?: number | null;
  commentary?: string | null;
}

export interface LiveSummary {
  status: 'live';
  inning: number;
  team1?: { id: number; name: string };
  team2?: { id: number; name: string };
  score: InningsScore;
  innings?: {
    inning: number;
    team: { id: number; name: string };
    score: InningsScore;
    isLive: boolean;
  }[];
  currentBatsmen: { id?: number; name?: string; runs: number; balls: number; isStriker?: boolean }[];
  currentBowler: { id?: number; name?: string; overs: string; runs: number; wickets: number } | null;
}

export interface DeliveryResponse {
  delivery: Delivery;
  inningsOver: boolean;
  matchEnded: boolean;
  currentScore: InningsScore;
}

export interface ScorecardInnings {
  inning: number;
  team: { id: number; name: string };
  score: InningsScore;
  batting: {
    batsman: { id: number; name: string };
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    howOut: string;
  }[];
  bowling: {
    bowler: { id: number; name: string };
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
  }[];
}

export interface EndedSummary {
  status: 'ended';
  result: string;
  winner: { id: number; name: string } | null;
  innings: { inning: number; team: { id: number; name: string }; score: InningsScore }[];
}
