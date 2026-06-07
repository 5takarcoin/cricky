import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { ApiError } from '../api/client';
import type { Team } from '../types';
import { PageHeader, Card, CardBody, Input, Button, Loading, Empty, Alert } from '../components/ui';

export function TeamsPage() {
  const [teams, setTeams]       = useState<Team[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.getMyTeams()
      .then(setTeams)
      .catch(() => setError('Failed to load teams'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await api.createTeam({ name: fd.get('name'), location: fd.get('location') || undefined });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="My teams"
        subtitle="Teams you belong to"
        action={<Button variant="secondary" onClick={() => setShowForm(!showForm)}>+ New team</Button>}
      />

      {error && <Alert className="mb-4">{error}</Alert>}

      {showForm && (
        <Card className="mb-6 max-w-md">
          <CardBody>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input name="name" label="Team name" required />
              <Input name="location" label="Location" />
              <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create team'}</Button>
            </form>
          </CardBody>
        </Card>
      )}

      {teams.length === 0 ? (
        <Empty message="You are not in any teams yet. Create one or get added by a captain." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <Link key={t.id} to={`/teams/${t.id}`}>
              <Card className="hover:shadow-md hover:border-gold/40 transition-all">
                <CardBody>
                  <h2 className="font-semibold text-lg text-pitch">{t.name}</h2>
                  {t.location && <p className="text-sm text-pitch/60 mt-1">{t.location}</p>}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
