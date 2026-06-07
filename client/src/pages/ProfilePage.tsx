import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../api';
import { ApiError } from '../api/client';
import type { Player } from '../types';
import { PageHeader, Card, CardBody, Input, Select, Button, Alert, Loading } from '../components/ui';

function ProfileForm({ player, onSaved }: { player: Player | null; onSaved: () => Promise<void> }) {
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole]       = useState(player?.role ?? 'bat');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name:     fd.get('name'),
      role:     fd.get('role'),
      bio:      fd.get('bio') || undefined,
      batHand:  fd.get('batHand') || undefined,
      bowlType: fd.get('bowlType') || undefined,
      bowlHand: fd.get('bowlHand') || undefined,
    };

    try {
      if (player) await api.updatePlayer(body);
      else await api.createPlayer(body);
      await onSaved();
      setSuccess('Profile saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <Alert className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      <Card className="max-w-lg">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="name" label="Display name" required defaultValue={player?.name ?? ''} />
            <Select name="role" label="Playing role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="bat">Batsman</option>
              <option value="bowl">Bowler</option>
              <option value="all">All-rounder</option>
              <option value="wk">Wicket-keeper</option>
            </Select>
            <Input name="bio" label="Bio" defaultValue={player?.bio ?? ''} />
            <div className="grid grid-cols-2 gap-4">
              <Select name="batHand" label="Batting hand" defaultValue={player?.batHand ?? ''}>
                <option value="">—</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
              </Select>
              {(role === 'bowl' || role === 'all') && (
                <Select name="bowlType" label="Bowling type" defaultValue={player?.bowlType ?? ''} required>
                  <option value="">Select</option>
                  <option value="seam">Seam</option>
                  <option value="spin">Spin</option>
                </Select>
              )}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : player ? 'Update profile' : 'Create profile'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

export function ProfilePage() {
  const { player, refreshPlayer, loading: authLoading } = useAuth();

  if (authLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Player profile"
        subtitle={player ? 'Update your cricket profile' : 'Create your profile to join teams and tournaments'}
      />
      <ProfileForm key={player?.id ?? 'new'} player={player} onSaved={refreshPlayer} />
    </div>
  );
}
