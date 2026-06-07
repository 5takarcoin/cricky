import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../api';
import type { Tournament } from '../types';
import { PageHeader, Card, CardBody, Button, Badge, Loading, Empty, Alert } from '../components/ui';

export function HomePage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    api.getTournaments()
      .then(setTournaments)
      .catch(() => setError('Failed to load tournaments'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Tournaments"
        subtitle="Browse and manage cricket tournaments"
        action={user && (
          <Link to="/tournaments/new">
            <Button variant="secondary">+ New tournament</Button>
          </Link>
        )}
      />

      {error && <Alert className="mb-4">{error}</Alert>}

      {tournaments.length === 0 ? (
        <Empty message="No tournaments yet. Create one to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`}>
              <Card className="hover:shadow-md hover:border-gold/40 transition-all h-full">
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-semibold text-lg text-pitch">{t.name}</h2>
                    <Badge status={t.type} />
                  </div>
                  {t.venue && <p className="text-sm text-pitch/60">{t.venue}</p>}
                  <p className="text-sm text-pitch/50 mt-2">{t.overs} overs</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
