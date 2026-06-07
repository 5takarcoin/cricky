import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';
import { Card, CardBody, Input, Select, Button, Alert } from '../components/ui';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await register(
        fd.get('username') as string,
        fd.get('password') as string,
        fd.get('role') as string,
      );
      navigate('/profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardBody>
          <h1 className="text-2xl font-bold text-pitch mb-1">Create account</h1>
          <p className="text-pitch/60 text-sm mb-6">Join LearnDrizzle to play or manage cricket tournaments</p>

          {error && <Alert className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="username" label="Username" required minLength={3} />
            <Input name="password" label="Password" type="password" required minLength={6} />
            <Select name="role" label="Role" defaultValue="player">
              <option value="player">Player</option>
              <option value="manager">Manager</option>
              <option value="both">Both</option>
            </Select>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </form>

          <p className="text-sm text-pitch/60 mt-4 text-center">
            Already have an account? <Link to="/login" className="text-pitch font-medium underline">Sign in</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
