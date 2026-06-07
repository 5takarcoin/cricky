import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { getAccessToken, setAccessToken, api as fetchApi } from '../api/client';
import * as api from '../api';
import type { User, Player } from '../types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [player, setPlayer]   = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPlayer = useCallback(async () => {
    try {
      const p = await api.getMyPlayer();
      setPlayer(p);
    } catch {
      setPlayer(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const { accessToken } = await fetchApi<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
        setAccessToken(accessToken);
        await refreshPlayer();
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshPlayer]);

  const login = async (username: string, password: string) => {
    const data = await api.login({ username, password });
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    await refreshPlayer();
  };

  const register = async (username: string, password: string, role: string) => {
    const data = await api.register({ username, password, role });
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    setPlayer(null);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPlayer(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, player, loading, login, register, logout, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  );
}
