import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import { ApiError } from '../api/client';
import type { Match, LiveSummary, EndedSummary, Team, ScorecardInnings } from '../types';
import { PageHeader, Card, CardBody, Button, Badge, Loading, Alert } from '../components/ui';
import { LiveSummaryView } from '../components/match/LiveSummaryView';
import { ScorecardView } from '../components/match/ScorecardView';
import { ScoringScreen } from '../components/match/ScoringScreen';
import { squadsForInning } from '../lib/scoring';
import { loadMatchTeams } from '../lib/squads';

type Summary = LiveSummary | EndedSummary | { status: 'scheduled'; scheduledAt?: string };

function MatchPageContent({ matchId }: { matchId: number }) {
  const [match, setMatch]           = useState<Match | null>(null);
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [scorecard, setScorecard]     = useState<ScorecardInnings[] | null>(null);
  const [team1, setTeam1]           = useState<Team | null>(null);
  const [team2, setTeam2]           = useState<Team | null>(null);
  const [tab, setTab]               = useState<'live' | 'score' | 'scorecard'>('live');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [inningsOverMsg, setInningsOverMsg] = useState<string | null>(null);
  const [matchEndedMsg, setMatchEndedMsg]   = useState(false);
  const [scoringInning, setScoringInning]     = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api.getMatch(matchId),
          api.getMatchSummary(matchId),
        ]);
        if (cancelled) return;
        setMatch(m);
        setSummary(s);
        if (s.status === 'live') setScoringInning((s as LiveSummary).inning);
        const teams = await loadMatchTeams(m);
        if (cancelled) return;
        setTeam1(teams.team1);
        setTeam2(teams.team2);
      } catch {
        if (!cancelled) setError('Failed to load match');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  // Viewer: poll summary every 5s (not on scorer tab)
  useEffect(() => {
    if (match?.status !== 'live' || tab === 'score') return;
    const interval = setInterval(() => {
      api.getMatchSummary(matchId).then((s) => setSummary(s)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [match?.status, matchId, tab]);

  useEffect(() => {
    if (tab === 'scorecard' && !scorecard) {
      api.getScorecard(matchId).then((sc) => setScorecard(sc.innings)).catch(() => {});
    }
  }, [tab, scorecard, matchId]);

  const handleStart = async () => {
    setError('');
    try {
      await api.updateMatchStatus(matchId, 'live');
      setSuccess('Match is live — open Score tab to begin');
      setTab('score');
      const s = await api.getMatchSummary(matchId);
      setSummary(s);
      const m = await api.getMatch(matchId);
      setMatch(m);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start match');
    }
  };

  const handleEnd = async () => {
    setError('');
    try {
      await api.updateMatchStatus(matchId, 'ended');
      setSuccess('Match ended — set the result');
      const [m, s] = await Promise.all([api.getMatch(matchId), api.getMatchSummary(matchId)]);
      setMatch(m);
      setSummary(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to end match');
    }
  };

  const handleResult = async (result: string) => {
    setError('');
    try {
      await api.setMatchResult(matchId, result);
      setSuccess('Result saved');
      const [m, s] = await Promise.all([api.getMatch(matchId), api.getMatchSummary(matchId)]);
      setMatch(m);
      setSummary(s);
      setMatchEndedMsg(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set result');
    }
  };

  if (loading) return <Loading />;
  if (!match || !team1 || !team2) return <Alert>Match not found</Alert>;

  const liveSummary = summary?.status === 'live' ? summary as LiveSummary : null;
  const squads = squadsForInning(scoringInning, team1, team2);

  const tabs = [
    { id: 'live' as const, label: 'Live' },
    ...(match.status === 'live' ? [{ id: 'score' as const, label: 'Score' }] : []),
    { id: 'scorecard' as const, label: 'Scorecard' },
  ];

  return (
    <div>
      <div className="mb-2">
        <Link to={`/tournaments/${match.tournamentId}`} className="text-sm text-pitch/50 hover:text-pitch">
          ← Back to tournament
        </Link>
      </div>

      <PageHeader
        title={`${match.team1?.name ?? 'Team 1'} vs ${match.team2?.name ?? 'Team 2'}`}
        subtitle={match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : undefined}
        action={<Badge status={match.status} />}
      />

      {error && <Alert className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      {inningsOverMsg && (
        <Alert type="success" className="mb-4">
          Innings over — {inningsOverMsg}. {matchEndedMsg ? 'Match complete!' : 'Switch to innings 2.'}
        </Alert>
      )}

      <Card className="mb-6">
        <CardBody className="flex flex-wrap gap-3">
          {match.status === 'scheduled' && (
            <Button variant="secondary" onClick={handleStart}>Start match</Button>
          )}
          {match.status === 'live' && (
            <Button variant="danger" onClick={handleEnd}>End match</Button>
          )}
          {match.status === 'ended' && match.result === 'pending' && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-pitch/60">Set result:</span>
              <Button variant="ghost" className="text-xs!" onClick={() => handleResult('team1_win')}>{match.team1?.name} win</Button>
              <Button variant="ghost" className="text-xs!" onClick={() => handleResult('team2_win')}>{match.team2?.name} win</Button>
              <Button variant="ghost" className="text-xs!" onClick={() => handleResult('tie')}>Tie</Button>
              <Button variant="ghost" className="text-xs!" onClick={() => handleResult('no_result')}>No result</Button>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex gap-1 mb-6 border-b border-cream-dark">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-gold text-pitch' : 'border-transparent text-pitch/50 hover:text-pitch'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'live' && summary && <LiveSummaryView summary={summary} />}

      {tab === 'score' && match.status === 'live' && (
        matchEndedMsg ? (
          <Card>
            <CardBody className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-pitch">Match Over</h2>
              <p className="text-pitch/60">Set the result from the controls above, or view the scorecard.</p>
              <Button variant="secondary" onClick={() => setTab('scorecard')}>View scorecard</Button>
            </CardBody>
          </Card>
        ) : (
          <ScoringScreen
            key={scoringInning}
            match={match}
            battingSquad={squads.batting}
            bowlingSquad={squads.bowling}
            initialSummary={liveSummary?.inning === scoringInning ? liveSummary : null}
            onSummaryChange={(s) => { setSummary(s); setScoringInning(s.inning); }}
            onInningsOver={(inn, sc) => {
              setInningsOverMsg(`Innings ${inn}: ${sc.runs}/${sc.wickets} (${sc.overs} ov)`);
              if (!matchEndedMsg) setScoringInning(inn + 1);
            }}
            onMatchEnded={() => setMatchEndedMsg(true)}
          />
        )
      )}

      {tab === 'scorecard' && (
        scorecard
          ? <ScorecardView innings={scorecard} />
          : <Loading />
      )}
    </div>
  );
}

export function MatchPage() {
  const { id } = useParams<{ id: string }>();
  return <MatchPageContent key={id} matchId={Number(id)} />;
}
