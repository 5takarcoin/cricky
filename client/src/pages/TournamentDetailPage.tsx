import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Tournament, Fixture, Team } from '../types';
import { PageHeader, Card, CardBody, Input, Button, Badge, Loading, Alert, Empty } from '../components/ui';

function TournamentDetailContent({ tournamentId }: { tournamentId: number }) {
  const { player } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [fixtures, setFixtures]     = useState<Fixture[]>([]);
  const [myTeams, setMyTeams]       = useState<Team[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [generating, setGenerating] = useState(false);

  const reloadTournament = () => {
    Promise.all([
      api.getTournament(tournamentId),
      api.getFixtures(tournamentId),
    ])
      .then(([t, f]) => { setTournament(t); setFixtures(f); })
      .catch(() => setError('Failed to load tournament'));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getTournament(tournamentId),
      api.getFixtures(tournamentId),
    ])
      .then(([t, f]) => {
        if (!cancelled) { setTournament(t); setFixtures(f); }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load tournament');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  useEffect(() => {
    if (!player) return;
    api.getMyTeams().then(setMyTeams).catch(() => {});
  }, [player]);

  const handleApply = async (teamId: number) => {
    setError('');
    try {
      const res = await api.applyToTournament(tournamentId, teamId);
      setSuccess(res.message);
      reloadTournament();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to apply');
    }
  };

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.generateFixtures(tournamentId, {
        startDate:     new Date(fd.get('startDate') as string).toISOString(),
        matchesPerDay: Number(fd.get('matchesPerDay')),
      });
      setSuccess(res.message);
      reloadTournament();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate fixtures');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loading />;
  if (!tournament) return <Alert>Tournament not found</Alert>;

  const confirmedIds = new Set(tournament.teams?.map((t) => t.id) ?? []);

  return (
    <div>
      <PageHeader
        title={tournament.name}
        subtitle={[tournament.venue, `${tournament.overs} overs`].filter(Boolean).join(' · ')}
      />

      {error && <Alert className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      {tournament.description && (
        <p className="text-pitch/70 mb-6">{tournament.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-pitch mb-3">Confirmed teams ({tournament.teams?.length ?? 0})</h2>
            {tournament.teams?.length ? (
              <ul className="space-y-2">
                {tournament.teams.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold" />
                    {t.name}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty message="No confirmed teams yet" />
            )}
          </CardBody>
        </Card>

        {player && myTeams.length > 0 && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-pitch mb-3">Apply with your team</h2>
              <ul className="space-y-2">
                {myTeams.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span>{t.name}</span>
                    {confirmedIds.has(t.id) ? (
                      <Badge status="confirmed" />
                    ) : (
                      <Button variant="secondary" className="py-1! px-3! text-xs" onClick={() => handleApply(t.id)}>
                        Apply
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      <Card className="mb-8">
        <CardBody>
          <h2 className="font-semibold text-pitch mb-4">Generate fixtures</h2>
          <form onSubmit={handleGenerate} className="flex flex-wrap gap-4 items-end">
            <Input
              name="startDate"
              label="Start date"
              type="datetime-local"
              required
              className="w-auto! min-w-[200px]"
            />
            <Input
              name="matchesPerDay"
              label="Matches per day"
              type="number"
              min={1}
              max={10}
              defaultValue={2}
              required
              className="w-24!"
            />
            <Button type="submit" variant="secondary" disabled={generating}>
              {generating ? 'Generating…' : 'Generate round robin'}
            </Button>
          </form>
        </CardBody>
      </Card>

      <h2 className="font-semibold text-xl text-pitch mb-4">Fixtures</h2>
      {fixtures.length === 0 ? (
        <Empty message="No fixtures yet. Generate or create matches manually." />
      ) : (
        <div className="space-y-3">
          {fixtures.map((f) => (
            <Link key={f.id} to={`/matches/${f.matchId}`}>
              <Card className="hover:shadow-md hover:border-gold/40 transition-all">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{f.team1?.name ?? 'TBD'}</span>
                    <span className="text-pitch/40 text-sm">vs</span>
                    <span className="font-medium">{f.team2?.name ?? 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {f.status && <Badge status={f.status} />}
                    <span className="text-pitch/50">
                      {new Date(f.scheduledAt).toLocaleString()}
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <TournamentDetailContent key={id} tournamentId={Number(id)} />;
}
