/**
 * @file components/admin/AdminView.tsx
 * @description Interface de contrôle jury — Mode clair (cohérent avec PublicView).
 *
 * Palette :
 * - Fond principal : #f5f2ed
 * - Surfaces cartes : #fff avec bordure #e0ddd8
 * - Sidebar candidats : #ede9e3
 * - Textes : #111 (primary), #666 (secondary), #aaa (tertiary)
 * - Accent actif : #000 (fond noir, texte blanc)
 * - CORRECT : #16a34a / INCORRECT : #dc2626
 */

import React, { useState, useRef } from 'react';
import useCompetitionStore, {
  selectCandidatActif,
  selectMotsDisponibles,
  selectScoreboard,
} from '../../store/useCompetitionStore';
import { useChrono, useKeyboard, useSound } from '../../hooks';
import CsvImporter from './CsvImporter';
import { PHASE_LABELS, PHASE_TIME_LIMITS } from '../../types';
import type { Phase } from '../../types';

// ─────────────────────────────────────────────
// StatBadge — cercle compteur header
// ─────────────────────────────────────────────

const StatBadge: React.FC<{ value: string | number; label: string; active?: boolean }> = ({
  value, label, active = false,
}) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black border-2"
      style={{
        background: active ? '#000' : '#fff',
        color: active ? '#fff' : '#333',
        borderColor: active ? '#000' : '#ddd',
      }}
    >
      {value}
    </div>
    <span className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#aaa' }}>
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────
// WordProgress
// ─────────────────────────────────────────────

const WordProgress: React.FC<{ used: number; total: number }> = ({ used, total }) => {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium" style={{ color: '#999' }}>Progression :</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#e5e5e5' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: '#111' }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color: '#666' }}>
        {pct}% ({used}/{total})
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────
// ChronoDisplay
// ─────────────────────────────────────────────

const ChronoDisplay: React.FC<{ seconds: number; active: boolean; total: number }> = ({
  seconds, active, total,
}) => {
  const pct = (seconds / total) * 100;
  const isLow = seconds <= 10;
  return (
    <div className="flex items-center gap-3">
      <div
        className={`text-2xl font-black tabular-nums transition-colors ${isLow ? 'animate-pulse' : ''}`}
        style={{ color: isLow ? '#dc2626' : '#111' }}
      >
        {String(seconds).padStart(2, '0')}
      </div>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#e5e5e5' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: isLow ? '#dc2626' : '#111' }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DifficultyBadge
// ─────────────────────────────────────────────

const DifficultyBadge: React.FC<{ niveau: number }> = ({ niveau }) => (
  <div className="flex gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="w-2 h-2 border"
        style={{
          background: i < niveau ? '#111' : 'transparent',
          borderColor: i < niveau ? '#111' : '#ddd',
        }}
      />
    ))}
  </div>
);

// ─────────────────────────────────────────────
// Carte générique
// ─────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`flex flex-col gap-3 p-4 ${className}`}
    style={{ background: '#fff', border: '1.5px solid #e0ddd8' }}
  >
    {children}
  </div>
);

const CardLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs tracking-widest uppercase font-bold" style={{ color: '#aaa' }}>
    {children}
  </p>
);

// ─────────────────────────────────────────────
// Vue principale Admin
// ─────────────────────────────────────────────

const AdminView: React.FC = () => {
  const [newCandidatNom, setNewCandidatNom] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const competition    = useCompetitionStore((s) => s.competition);
  const candidates     = useCompetitionStore((s) => s.candidates);
  const words          = useCompetitionStore((s) => s.words);
  const candidatActif  = useCompetitionStore(selectCandidatActif);
  const motsDisponibles = useCompetitionStore(selectMotsDisponibles);
  const scoreboard     = useCompetitionStore(selectScoreboard);

  const {
    updateLettres, effacerLettres, validerCorrect, validerIncorrect,
    reveler, tirerMotSuivant, ajouterCandidat, supprimerCandidat,
    setCandidatActif, setPhase,
    triggerGlobalChrono, resetGlobalChrono
  } = useCompetitionStore();

  useChrono();
  useKeyboard(!inputFocused);
  const { playSuccess, playError } = useSound();

  const handleValiderCorrect = async () => { playSuccess(); await validerCorrect(); };
  const handleValiderIncorrect = async () => { playError(); await validerIncorrect(); };

  const handleAjouterCandidat = async (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!newCandidatNom.trim()) return;
    await ajouterCandidat(newCandidatNom.trim());
    setNewCandidatNom('');
  };

  const phases: Phase[] = ['qualifications', 'eliminatoires', 'demi-finale', 'finale'];
  const totalUsed = words.filter((w) => w.estUtilise).length;

  const statusColor =
    competition.status === 'correct'   ? '#16a34a' :
    competition.status === 'incorrect' ? '#dc2626' :
    '#aaa';
  const statusBorder =
    competition.status === 'correct'   ? '#bbf7d0' :
    competition.status === 'incorrect' ? '#fecaca' :
    '#e0ddd8';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f2ed' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1.5px solid #e0ddd8', background: '#fff' }}>
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.5em] uppercase font-medium" style={{ color: '#bbb' }}>
              CONCOURS
            </p>
            <h1 className="font-black uppercase leading-none mt-0.5">
              <span className="text-xl tracking-[0.15em]" style={{ color: '#111' }}>ÉPELLE </span>
              <span className="text-3xl tracking-[0.1em]" style={{ color: '#000' }}>MOI</span>
            </h1>
            <p className="text-xs tracking-[0.3em] uppercase mt-0.5 font-medium" style={{ color: '#bbb' }}>
              INTERFACE DE CONTRÔLE
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Accès rapides */}
            <div className="flex gap-2 pr-6" style={{ borderRight: '1.5px solid #f0ede8' }}>
              <button
                onClick={() => window.open('/public', '_blank')}
                className="px-3 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all"
                style={{ border: '1.5px solid #111', color: '#111', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#111'; }}
              >
                VUE PUBLIC ↗
              </button>
              <button
                onClick={() => window.open('/dashboard', '_blank')}
                className="px-3 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all"
                style={{ border: '1.5px solid #e0ddd8', color: '#666', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f2ed'; e.currentTarget.style.borderColor = '#bbb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e0ddd8'; }}
              >
                CLASSEMENT ↗
              </button>
            </div>

            <div className="flex gap-8">
              <StatBadge value={words.length} label="MOTS" />
              <StatBadge value={candidates.length} label="CANDIDATS" />
              {competition.globalChronoActif && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-mono font-black border-2 border-red-500 text-red-500 bg-red-50">
                    {Math.floor(competition.globalChronoTemps / 60)}:{String(competition.globalChronoTemps % 60).padStart(2, '0')}
                  </div>
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-red-400">
                    GLOBAL
                  </span>
                </div>
              )}
              <StatBadge
                value={competition.phase.charAt(0).toUpperCase()}
                label={PHASE_LABELS[competition.phase]}
                active
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Corps ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-8 py-6 grid grid-cols-[1fr_380px] gap-6">

        {/* ── Colonne gauche ── */}
        <div className="flex flex-col gap-4">

          {/* Sélecteur de phase */}
          <div className="flex gap-2">
            {phases.map((p) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className="px-4 py-1.5 text-xs tracking-widest uppercase font-bold transition-all"
                style={{
                  border: '1.5px solid',
                  borderColor: competition.phase === p ? '#000' : '#ddd',
                  background: competition.phase === p ? '#000' : '#fff',
                  color: competition.phase === p ? '#fff' : '#999',
                }}
              >
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Import CSV */}
          <CsvImporter />

          {/* Progression */}
          {words.length > 0 && (
            <Card>
              <WordProgress used={totalUsed} total={words.length} />
            </Card>
          )}

          {/* Zone mot actuel */}
          {competition.motActuel ? (
            <Card>
              <div className="flex items-start justify-between">
                <CardLabel>MOT À ÉPELLER</CardLabel>
                <DifficultyBadge niveau={competition.motActuel.niveau} />
              </div>

              {/* Mot en grand */}
              <div
                className="text-5xl font-black tracking-wider py-3"
                style={{ color: '#000' }}
              >
                {competition.motActuel.mot}
              </div>

              {/* Chrono */}
              <ChronoDisplay
                seconds={competition.tempsRestant}
                active={competition.chronoActif}
                total={PHASE_TIME_LIMITS[competition.phase]}
              />

              {/* Définition + tags */}
              <div className="flex flex-col gap-3 pt-3" style={{ borderTop: '1.5px solid #f0ede8' }}>
                <div>
                  <CardLabel>DÉFINITION</CardLabel>
                  <p className="text-sm leading-relaxed mt-1" style={{ color: '#333' }}>
                    {competition.motActuel.definition}
                  </p>
                </div>

                {competition.motActuel.exemple && (
                  <div>
                    <CardLabel>EXEMPLE</CardLabel>
                    <p className="text-sm italic mt-1" style={{ color: '#777' }}>
                      "{competition.motActuel.exemple}"
                    </p>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    competition.motActuel.categorie,
                    competition.motActuel.nature,
                    competition.motActuel.etymologie,
                    competition.motActuel.prononciation,
                  ].filter(Boolean).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs font-medium"
                      style={{ border: '1px solid #e0ddd8', color: '#777', background: '#f8f6f3' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="items-center justify-center min-h-48">
              <p className="text-sm tracking-widest uppercase" style={{ color: '#ccc' }}>
                Aucun mot sélectionné
              </p>
              <button
                onClick={tirerMotSuivant}
                disabled={motsDisponibles.length === 0}
                className="px-6 py-2 text-sm font-bold tracking-widest transition-all disabled:opacity-30"
                style={{ border: '1.5px solid #111', color: '#111', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#111'; }}
              >
                TIRER UN MOT
              </button>
            </Card>
          )}

          {/* Zone saisie épellation */}
          {competition.motActuel && (
            <Card>
              <div className="flex items-center justify-between">
                <CardLabel>SAISIE D'ÉPELLATION</CardLabel>
                <span className="text-xs font-semibold" style={{ color: '#aaa' }}>
                  {competition.lettresSaisies.length}/{competition.motActuel.mot.length}
                </span>
              </div>

              {/* Tuiles de lettres */}
              <div className="flex gap-2 flex-wrap min-h-14 items-center">
                {competition.lettresSaisies.split('').map((l, i) => (
                  <div
                    key={i}
                    className="w-10 h-12 flex items-center justify-center font-black text-lg uppercase letter-tile-enter"
                    style={{
                      border: '2px solid #111',
                      background: '#fff',
                      boxShadow: '2px 2px 0 #ccc',
                      color: '#000',
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    {l}
                  </div>
                ))}
                {competition.lettresSaisies.length === 0 && (
                  <span className="text-sm" style={{ color: '#ccc' }}>
                    Utilisez le clavier ou tapez ici...
                  </span>
                )}
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={competition.lettresSaisies}
                onChange={(e) => updateLettres(e.target.value.toUpperCase())}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                className="px-4 py-2 text-lg tracking-widest uppercase font-black w-full outline-none transition-all"
                style={{
                  border: '1.5px solid #ddd',
                  background: '#fafafa',
                  color: '#000',
                }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = '#111'; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = '#ddd'; }}
                placeholder="ÉPELER ICI..."
              />

              {/* Boutons secondaires */}
              <div className="flex gap-2">
                {[
                  { label: 'RETOUR', onClick: () => updateLettres(competition.lettresSaisies.slice(0, -1)), danger: false },
                  { label: 'EFFACER', onClick: effacerLettres, danger: true },
                  { 
                    label: competition.globalChronoActif ? 'STOP CHRONO' : 'CHRONO 3M', 
                    onClick: triggerGlobalChrono, 
                    accent: true 
                  },
                ].map(({ label, onClick, danger, accent }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="px-4 py-2 text-xs font-bold tracking-widest transition-all"
                    style={{
                      border: `1.5px solid ${danger ? '#fecaca' : accent ? '#000' : '#e0ddd8'}`,
                      color: danger ? '#dc2626' : accent ? '#fff' : '#999',
                      background: accent ? '#000' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (accent) {
                        e.currentTarget.style.background = '#333';
                      } else {
                        e.currentTarget.style.background = danger ? '#fef2f2' : '#f5f2ed';
                        e.currentTarget.style.borderColor = danger ? '#dc2626' : '#bbb';
                      }
                    }}
                    onMouseLeave={e => {
                      if (accent) {
                        e.currentTarget.style.background = '#000';
                      } else {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = danger ? '#fecaca' : '#e0ddd8';
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Contrôles principaux */}
              <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1.5px solid #f0ede8' }}>
                <CardLabel>CONTRÔLES PRINCIPAUX</CardLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleValiderCorrect}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-widest transition-all"
                    style={{ border: '1.5px solid #bbf7d0', color: '#16a34a', background: '#f0fdf4' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                  >
                    ✓ CORRECT
                  </button>
                  <button
                    onClick={handleValiderIncorrect}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-widest transition-all"
                    style={{ border: '1.5px solid #fecaca', color: '#dc2626', background: '#fef2f2' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
                  >
                    ✗ INCORRECT
                  </button>
                  <button
                    onClick={tirerMotSuivant}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-widest transition-all"
                    style={{ border: '1.5px solid #e0ddd8', color: '#555', background: '#fff' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f2ed'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    ▶ MOT SUIVANT
                  </button>
                  <button
                    onClick={reveler}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-widest transition-all"
                    style={{ border: '1.5px solid #e0ddd8', color: '#555', background: '#fff' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f2ed'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    ◉ RÉVÉLER
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Colonne droite : candidats ── */}
        <div className="flex flex-col gap-4">

          {/* Candidat actif */}
          {candidatActif && (
            <div
              className="p-4 flex items-center justify-between"
              style={{ border: `1.5px solid ${statusBorder}`, background: '#fff' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center text-sm font-black"
                  style={{ background: '#000', color: '#fff' }}
                >
                  {candidatActif.rang}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#111' }}>{candidatActif.nom}</p>
                  <p className="text-xs font-medium" style={{ color: '#aaa' }}>
                    Score : {candidatActif.score}
                  </p>
                </div>
              </div>
              <div
                className="text-xs font-bold px-2 py-1"
                style={{ border: `1px solid ${statusBorder}`, color: statusColor }}
              >
                {competition.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          )}

          {/* Liste candidats */}
          <div className="flex-1 flex flex-col" style={{ border: '1.5px solid #e0ddd8', background: '#fff' }}>

            {/* Header liste */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1.5px solid #f0ede8', background: '#fafaf9' }}
            >
              <span className="text-xs tracking-widest uppercase font-bold" style={{ color: '#aaa' }}>
                CANDIDATS
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5"
                style={{ border: '1px solid #e0ddd8', color: '#666', background: '#f5f2ed' }}
              >
                {candidates.length} participants
              </span>
            </div>

            {/* Ajouter candidat */}
            <div
              className="flex gap-2 p-3"
              style={{ borderBottom: '1.5px solid #f0ede8' }}
            >
              <input
                type="text"
                value={newCandidatNom}
                onChange={(e) => setNewCandidatNom(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={handleAjouterCandidat}
                placeholder="Nom du candidat"
                className="flex-1 px-3 py-2 text-sm outline-none transition-all"
                style={{
                  border: '1.5px solid #ddd',
                  background: '#fafafa',
                  color: '#111',
                }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = '#111'; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = '#ddd'; }}
              />
              <button
                onClick={handleAjouterCandidat}
                className="px-4 py-2 text-xs font-bold tracking-widest transition-all"
                style={{ border: '1.5px solid #000', background: '#000', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#333'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#000'; }}
              >
                AJOUTER
              </button>
            </div>

            {/* Liste scrollable */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '400px' }}>
              {scoreboard.map((c) => {
                const isActive = c.id === competition.candidatActifId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setCandidatActif(c.id)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all"
                    style={{
                      borderBottom: '1px solid #f5f2ed',
                      borderLeft: isActive ? '3px solid #000' : '3px solid transparent',
                      background: isActive ? '#f5f2ed' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#fafaf9'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 flex items-center justify-center text-xs font-black"
                        style={{
                          border: '1.5px solid',
                          borderColor: isActive ? '#000' : '#ddd',
                          background: isActive ? '#000' : 'transparent',
                          color: isActive ? '#fff' : '#aaa',
                        }}
                      >
                        {c.rang}
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: isActive ? '#000' : '#555' }}
                      >
                        {c.nom}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: '#888' }}>
                        {c.score} pts
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); supprimerCandidat(c.id); }}
                        className="text-sm transition-colors"
                        style={{ color: '#ddd' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#ddd'; }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}

              {candidates.length === 0 && (
                <div className="px-4 py-10 text-center text-xs tracking-widest uppercase" style={{ color: '#ddd' }}>
                  Aucun candidat
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;