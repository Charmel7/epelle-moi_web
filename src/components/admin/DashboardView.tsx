/**
 * @file components/admin/DashboardView.tsx
 * @description Dashboard analytique post-compétition.
 *
 * Affiche :
 * - Podium top 3 candidats
 * - Statistiques globales (mots utilisés, score moyen, etc.)
 * - Graphique barres : utilisation par catégorie (via Recharts)
 * - Export CSV des résultats
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import useCompetitionStore, { selectScoreboard } from '../../store/useCompetitionStore';
import csvService from '../../services/csvService';
import type { CompetitionAnalytics } from '../../types';

// ─────────────────────────────────────────────
// Calcul des analytics depuis le store
// ─────────────────────────────────────────────

function useAnalytics(): CompetitionAnalytics {
  const words = useCompetitionStore((s) => s.words);
  const candidates = useCompetitionStore((s) => s.candidates);
  const scoreboard = useCompetitionStore(selectScoreboard);

  const motsUtilises = words.filter((w) => w.estUtilise).length;
  const scores = candidates.map((c) => c.score);
  const scoreMoyen = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
    : 0;

  return {
    totalMots: words.length,
    motsUtilises,
    totalCandidats: candidates.length,
    scoreMax: Math.max(0, ...scores),
    scoreMoyen,
    categorieStats: csvService.getCategoryStats(words),
    topCandidats: scoreboard.slice(0, 3),
  };
}

// ─────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; sub?: string }> = ({
  label, value, sub
}) => (
  <div className="border border-white/10 p-5 flex flex-col gap-1">
    <p className="text-white/30 text-xs tracking-widest uppercase">{label}</p>
    <p className="text-4xl font-black text-white">{value}</p>
    {sub && <p className="text-white/30 text-xs">{sub}</p>}
  </div>
);

const PodiumCard: React.FC<{
  rang: number; nom: string; score: number;
}> = ({ rang, nom, score }) => {
  const heights = ['h-28', 'h-20', 'h-14'];
  const labels = ['1ER', '2ÈME', '3ÈME'];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-white/60 text-sm font-bold">{nom}</div>
      <div className="text-white font-black text-lg">{score} pts</div>
      <div
        className={`w-24 ${heights[rang - 1]} border border-white/20 flex items-center justify-center`}
      >
        <span className="text-white/30 text-xs tracking-widest">{labels[rang - 1]}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Vue principale
// ─────────────────────────────────────────────

const DashboardView: React.FC = () => {
  const analytics = useAnalytics();
  const words = useCompetitionStore((s) => s.words);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-white/30 text-xs tracking-[0.5em] uppercase">CONCOURS</p>
            <h1 className="font-black uppercase">
              <span className="text-xl tracking-[0.15em]">ÉPELLE </span>
              <span className="text-3xl tracking-[0.1em]">MOI</span>
            </h1>
            <p className="text-white/30 text-xs tracking-[0.3em] uppercase mt-1">
              TABLEAU DE BORD
            </p>
          </div>
          <button
            onClick={() => csvService.exportToCsv(words)}
            className="border border-white/40 px-6 py-2 text-sm text-white hover:bg-white hover:text-black transition-all"
          >
            EXPORTER CSV
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col gap-8">

        {/* Stats globales */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="MOTS UTILISÉS"
            value={analytics.motsUtilises}
            sub={`sur ${analytics.totalMots} disponibles`}
          />
          <StatCard label="CANDIDATS" value={analytics.totalCandidats} />
          <StatCard label="SCORE MAX" value={analytics.scoreMax} />
          <StatCard label="SCORE MOYEN" value={analytics.scoreMoyen} />
        </div>

        {/* Podium */}
        {analytics.topCandidats.length >= 3 && (
          <div className="border border-white/10 p-8">
            <p className="text-white/30 text-xs tracking-widest uppercase mb-8 text-center">
              PODIUM FINAL
            </p>
            <div className="flex items-end justify-center gap-8">
              {/* 2ème — gauche */}
              {analytics.topCandidats[1] && (
                <PodiumCard rang={2} nom={analytics.topCandidats[1].nom} score={analytics.topCandidats[1].score} />
              )}
              {/* 1er — centre */}
              {analytics.topCandidats[0] && (
                <PodiumCard rang={1} nom={analytics.topCandidats[0].nom} score={analytics.topCandidats[0].score} />
              )}
              {/* 3ème — droite */}
              {analytics.topCandidats[2] && (
                <PodiumCard rang={3} nom={analytics.topCandidats[2].nom} score={analytics.topCandidats[2].score} />
              )}
            </div>
          </div>
        )}

        {/* Graphique par catégorie */}
        {analytics.categorieStats.length > 0 && (
          <div className="border border-white/10 p-6">
            <p className="text-white/30 text-xs tracking-widest uppercase mb-6">
              UTILISATION PAR CATÉGORIE
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.categorieStats} margin={{ left: -10 }}>
                <XAxis
                  dataKey="categorie"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 0,
                    color: 'white',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'utilises' ? 'Utilisés' : 'Total',
                  ]}
                />
                <Bar dataKey="total" fill="rgba(255,255,255,0.1)" />
                <Bar dataKey="utilises" fill="rgba(255,255,255,0.7)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Classement complet */}
        <div className="border border-white/10">
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-white/30 text-xs tracking-widest uppercase">
              CLASSEMENT FINAL
            </p>
          </div>
          {analytics.topCandidats.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-6 py-4 border-b border-white/5"
            >
              <div className="flex items-center gap-4">
                <span className="text-white/30 w-6 text-sm">{c.rang}</span>
                <span className="font-bold text-white">{c.nom}</span>
              </div>
              <span className="text-white/70 font-black">{c.score} pts</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default DashboardView;
