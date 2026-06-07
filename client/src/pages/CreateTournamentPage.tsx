import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { ApiError } from '../api/client';
import { PageHeader, Card, CardBody, Input, Select, Textarea, Button, Alert } from '../components/ui';

export function CreateTournamentPage() {
  const navigate = useNavigate();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const t = await api.createTournament({
        name:        fd.get('name'),
        venue:       fd.get('venue') || undefined,
        overs:       Number(fd.get('overs')),
        type:        fd.get('type'),
        description: fd.get('description') || undefined,
      });
      navigate(`/tournaments/${t.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New tournament" subtitle="Set up a cricket tournament" />
      {error && <Alert className="mb-4">{error}</Alert>}
      <Card className="max-w-lg">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="name" label="Name" required />
            <Input name="venue" label="Venue" />
            <Input name="overs" label="Overs per innings" type="number" min={1} max={50} defaultValue={20} required />
            <Select name="type" label="Entry type" defaultValue="application">
              <option value="application">Application (teams apply, manager approves)</option>
              <option value="fc">First-come (auto-confirm)</option>
              <option value="invite">Invite only</option>
            </Select>
            <Textarea name="description" label="Description" />
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create tournament'}</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
