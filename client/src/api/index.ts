import { api, setAccessToken } from './client';
import type {
  User, Player, Team, Tournament, Match, Fixture,
  DeliveryResponse, LiveSummary, EndedSummary, ScorecardInnings,
} from '../types';

// ─── Auth ─────────────────────────────────────────────────
export const register = (body: { username: string; password: string; role: string }) =>
  api<{ accessToken: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) })
    .then((d) => { setAccessToken(d.accessToken); return d; });

export const login = (body: { username: string; password: string }) =>
  api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) })
    .then((d) => { setAccessToken(d.accessToken); return d; });

export const logout = () =>
  api<{ message: string }>('/auth/logout', { method: 'POST' })
    .finally(() => setAccessToken(null));

// ─── Players ──────────────────────────────────────────────
export const getMyPlayer = () => api<Player>('/players/me');
export const createPlayer = (body: Record<string, unknown>) =>
  api<Player>('/players/me', { method: 'POST', body: JSON.stringify(body) });
export const updatePlayer = (body: Record<string, unknown>) =>
  api<Player>('/players/me', { method: 'PUT', body: JSON.stringify(body) });
export const getPlayer = (id: number) => api<Player>(`/players/${id}`);

// ─── Teams ────────────────────────────────────────────────
export const getMyTeams = () => api<Team[]>('/teams/my');
export const getTeam = (id: number) => api<Team>(`/teams/${id}`);
export const createTeam = (body: Record<string, unknown>) =>
  api<Team>('/teams', { method: 'POST', body: JSON.stringify(body) });
export const addPlayerToTeam = (teamId: number, playerId: number) =>
  api<{ message: string }>(`/teams/${teamId}/players`, { method: 'POST', body: JSON.stringify({ playerId }) });
export const setCaptain = (teamId: number, playerId: number) =>
  api<Team>(`/teams/${teamId}/captain`, { method: 'PUT', body: JSON.stringify({ playerId }) });

// ─── Tournaments ──────────────────────────────────────────
export const getTournaments = () => api<Tournament[]>('/tournaments');
export const getTournament = (id: number) => api<Tournament>(`/tournaments/${id}`);
export const createTournament = (body: Record<string, unknown>) =>
  api<Tournament>('/tournaments', { method: 'POST', body: JSON.stringify(body) });
export const applyToTournament = (tournamentId: number, teamId: number) =>
  api<{ message: string }>(`/tournaments/${tournamentId}/apply`, { method: 'POST', body: JSON.stringify({ teamId }) });
export const approveTeam = (tournamentId: number, teamId: number, status: 'confirmed' | 'rejected') =>
  api<{ message: string }>(`/tournaments/${tournamentId}/teams/${teamId}`, { method: 'PUT', body: JSON.stringify({ status }) });
export const generateFixtures = (tournamentId: number, body: { startDate: string; matchesPerDay: number }) =>
  api<{ message: string; matches: Match[] }>(`/tournaments/${tournamentId}/fixtures/generate`, { method: 'POST', body: JSON.stringify(body) });

// ─── Fixtures ─────────────────────────────────────────────
export const getFixtures = (tournamentId: number) => api<Fixture[]>(`/tournaments/${tournamentId}/fixtures`);

// ─── Matches ──────────────────────────────────────────────
export const getMatch = (id: number) => api<Match>(`/matches/${id}`);
export const updateMatchStatus = (id: number, status: 'live' | 'ended') =>
  api<{ message: string; status: string }>(`/matches/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
export const setMatchResult = (id: number, result: string) =>
  api<Match>(`/matches/${id}/result`, { method: 'PUT', body: JSON.stringify({ result }) });
export const getMatchSummary = (id: number) =>
  api<LiveSummary | EndedSummary | { status: 'scheduled'; scheduledAt?: string }>(`/matches/${id}/summary`);
export const getScorecard = (id: number) =>
  api<{ match: Match; innings: ScorecardInnings[] }>(`/matches/${id}/scorecard`);
export const recordDelivery = (matchId: number, body: object) =>
  api<DeliveryResponse>(`/matches/${matchId}/deliveries`, { method: 'POST', body: JSON.stringify(body) });
export const undoLastDelivery = (matchId: number) =>
  api<{ message: string; deletedId: number }>(`/matches/${matchId}/deliveries/last`, { method: 'DELETE' });
