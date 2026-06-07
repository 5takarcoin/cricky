import * as api from '../api';
import type { Match, Team } from '../types';

export async function loadMatchTeams(match: Match): Promise<{ team1: Team; team2: Team }> {
  const [team1, team2] = await Promise.all([
    api.getTeam(match.team1Id),
    api.getTeam(match.team2Id),
  ]);
  return { team1, team2 };
}
