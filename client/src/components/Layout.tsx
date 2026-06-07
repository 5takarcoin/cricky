import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Loading } from './ui';

export function Layout() {
  const { user, player, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-pitch text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="text-gold">●</span>
            LearnDrizzle
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link to="/" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">Tournaments</Link>
            {user && (
              <>
                <Link to="/teams" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">Teams</Link>
                <Link to="/profile" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
                  {player?.name ?? 'Profile'}
                </Link>
              </>
            )}
            {user ? (
              <Button variant="ghost" onClick={handleLogout} className="!text-white/80! hover:!bg-white/10! py-1.5!">
                Logout
              </Button>
            ) : (
              <>
                <Link to="/login" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">Login</Link>
                <Link to="/register" className="px-3 py-1.5 rounded-md bg-gold text-pitch-dark font-semibold hover:bg-gold-light transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-cream-dark py-6 text-center text-sm text-pitch/40">
        Cricket tournaments & live scoring
      </footer>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
