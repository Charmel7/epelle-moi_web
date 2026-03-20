/**
 * @file App.tsx
 * @description Point d'entrée de l'application — Routage entre les vues.
 *
 * Routes :
 *   /          → Redirige vers /admin
 *   /admin     → Interface de contrôle jury
 *   /public    → Écran de projection (plein écran, Realtime)
 *   /dashboard → Analytics post-compétition
 *
 * L'initialisation du store est faite ici (appel Supabase au montage).
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import AdminView from './components/admin/AdminView';
import PublicView from './components/public/PublicView';
import useCompetitionStore from './store/useCompetitionStore';
import './styles/animations.css';

// ─────────────────────────────────────────────
// Dashboard placeholder (à développer)
// ─────────────────────────────────────────────
const DashboardView = React.lazy(() => import('./components/admin/DashboardView'));

// ─────────────────────────────────────────────
// App principale
// ─────────────────────────────────────────────

const App: React.FC = () => {
  const initialize = useCompetitionStore((s) => s.initialize);
  const isLoading = useCompetitionStore((s) => s.isLoading);
  const error = useCompetitionStore((s) => s.error);

  // Initialisation au montage : charge l'état depuis Supabase
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/30 text-xs tracking-widest uppercase">ERREUR DE CONNEXION</p>
          <p className="text-red-400 text-sm max-w-md">{error}</p>
          <p className="text-white/20 text-xs">
            Vérifiez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
          </p>
          <button
            onClick={() => initialize()}
            className="border border-white/40 px-6 py-2 text-white text-sm hover:bg-white hover:text-black transition-all"
          >
            RÉESSAYER
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/public" element={<PublicView />} />
        <Route
          path="/dashboard"
          element={
            <React.Suspense
              fallback={
                <div className="min-h-screen bg-black flex items-center justify-center">
                  <p className="text-white/30 text-xs tracking-widest">CHARGEMENT...</p>
                </div>
              }
            >
              <DashboardView />
            </React.Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
