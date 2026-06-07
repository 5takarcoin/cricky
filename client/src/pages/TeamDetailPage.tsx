import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Team } from '../types';
import { PageHeader, Card, CardBody, Button, Loading, Alert } from '../components/ui';

function TeamDetailContent({ teamId }: { teamId: number }) {
  const { player } = useAuth();
  const [team, setTeam]       = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [captainId, setCaptainId] = useState('');

  const reloadTeam = () => {
    api.getTeam(teamId)
      .then((t) => { setTeam(t); setCaptainId(String(t.captainId ?? '')); })
      .catch(() => setError('Team not found'));
  };

  useEffect(() => {
    let cancelled = false;
    api.getTeam(teamId)
      .then((t) => {
        if (!cancelled) {
          setTeam(t);
          setCaptainId(String(t.captainId ?? ''));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Team not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [teamId]);

  const isCreator = team && player && team.createdBy === player.id;

  const handleSetCaptain = async () => {
    if (!captainId) return;
    try {
      await api.setCaptain(teamId, Number(captainId));
      reloadTeam();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set captain');
    }
  };

  if (loading) return <Loading />;
  if (!team) return <Alert>Team not found</Alert>;

  return (
    <div>
      <PageHeader title={team.name} subtitle={team.location ?? undefined} />

      {error && <Alert className="mb-4">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-pitch mb-4">Squad ({team.members?.length ?? 0})</h2>
            <ul className="divide-y divide-cream-dark">
              {team.members?.map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-pitch/50 text-sm ml-2 capitalize">{m.role}</span>
                  </div>
                  {team.captainId === m.id && (
                    <span className="text-xs font-semibold text-gold uppercase">Captain</span>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {isCreator && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-pitch mb-4">Manage team</h2>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-pitch">Assign captain</label>
                <select
                  value={captainId}
                  onChange={(e) => setCaptainId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-cream-dark"
                >
                  <option value="">Select player</option>
                  {team.members?.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <Button onClick={handleSetCaptain} disabled={!captainId}>Set captain</Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <TeamDetailContent key={id} teamId={Number(id)} />;
}
