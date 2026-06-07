import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout, ProtectedRoute } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { CreateTournamentPage } from './pages/CreateTournamentPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { MatchPage } from './pages/MatchPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="matches/:id" element={<MatchPage />} />
            <Route path="tournaments/new" element={<ProtectedRoute><CreateTournamentPage /></ProtectedRoute>} />
            <Route path="tournaments/:id" element={<TournamentDetailPage />} />

            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="teams/:id" element={<ProtectedRoute><TeamDetailPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
