import { createContext } from 'react';
import type { User, Player } from '../types';

export interface AuthState {
  user: User | null;
  player: Player | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
