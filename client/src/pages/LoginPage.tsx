import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';
import { Card, CardBody, Input, Button, Alert } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await login(fd.get('username') as string, fd.get('password') as string);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardBody>
          <h1 className="text-2xl font-bold text-pitch mb-1">Welcome back</h1>
          <p className="text-pitch/60 text-sm mb-6">Sign in to manage tournaments and score matches</p>

          {error && <Alert className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="username" label="Username" required autoComplete="username" />
            <Input name="password" label="Password" type="password" required autoComplete="current-password" />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-sm text-pitch/60 mt-4 text-center">
            No account? <Link to="/register" className="text-pitch font-medium underline">Sign up</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
