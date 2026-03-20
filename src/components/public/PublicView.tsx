/**
 * @file components/public/PublicView.tsx
 * @description Écran de projection — Vue publique temps réel.
 *
 * v5 — MODE CLAIR (optimisé projecteur en salle éclairée) :
 * - Fond blanc #f5f2ed, textes noirs — contraste maximal en lumière ambiante
 * - Tuiles fond blanc, bordure noire, ombre portée
 * - CORRECT vert saturé / INCORRECT rouge saturé
 * - Classement : candidat actif = bloc noir inversé (texte blanc)
 * - Filigrane lettres très subtil (opacity 4%)
 * - Badge FINALE doré sur fond clair
 * - Logos sponsors directement visibles (plus besoin de fond blanc)
 * - Ticker fond beige #ede9e3
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRealtime, useLetterStatus } from '../../hooks';
import supabaseService from '../../services/supabaseService';
import type { CompetitionState, Candidate } from '../../types';
import { PHASE_LABELS } from '../../types';

// ─────────────────────────────────────────────
// Sponsors 
// ─────────────────────────────────────────────

const SPONSORS: { nom: string; logoUrl?: string }[] = [
  { nom: 'CAEB-Abomey',logoUrl:'/logos/Logo_CAEB.png' },
  { nom: 'Club RFI Abomey',logoUrl:'/logos/Logo_RFI-ABOMEY.jpeg' },
 
];

// ─────────────────────────────────────────────
// SponsorItem — fallback texte si image échoue
// ─────────────────────────────────────────────

const SponsorItem: React.FC<{ sponsor: { nom: string; logoUrl?: string } }> = ({ sponsor }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = sponsor.logoUrl && !imgFailed;
  const displayText = sponsor.nom || 'PARTENAIRE';

  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {/* Losange séparateur — sombre sur fond clair */}
      <div className="w-1.5 h-1.5 rotate-45 flex-shrink-0" style={{ background: '#888' }} />
      {showImg ? (
        <img
          src={sponsor.logoUrl}
          alt={displayText}
          className="h-12 w-15 max-w-36 object-contain"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="text-sm tracking-[0.25em] uppercase font-bold whitespace-nowrap"
          style={{ color: '#444' }}
        >
          {displayText}
        </span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// SponsorsTicker
// ─────────────────────────────────────────────

const SponsorsTicker: React.FC = () => {
  const items = [...SPONSORS, ...SPONSORS];
  return (
    <div
      className="w-full overflow-hidden py-3 flex-shrink-0"
      style={{ borderTop: '2px solid #ddd', background: '#ede9e3' }}
    >
      <div className="flex items-center overflow-hidden">
        {/* Label fixe */}
        <div className="flex-shrink-0 px-6 mr-6" style={{ borderRight: '1.5px solid #ccc' }}>
          <span className="text-xs tracking-[0.4em] uppercase font-bold" style={{ color: '#777' }}>
            PARTENAIRES
          </span>
        </div>
        {/* Piste défilante */}
        <div className="flex-1 overflow-hidden relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #ede9e3, transparent)' }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #ede9e3, transparent)' }}
          />
          <div className="sponsors-ticker flex items-center gap-14 w-max">
            {items.map((sponsor, i) => (
              <SponsorItem key={i} sponsor={sponsor} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PhaseBadge — doré en finale, sobre sinon
// ─────────────────────────────────────────────

const PhaseBadge: React.FC<{ phase: string; isFinale: boolean }> = ({ phase, isFinale }) => {
  if (isFinale) {
    return (
      <div className="finale-badge relative flex items-center gap-3 px-7 py-2.5 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, rgba(180,130,0,.15), rgba(220,170,0,.25), rgba(180,130,0,.15))',
            border: '2px solid #a37800',
          }}
        />
        <div className="absolute inset-0 finale-shimmer" />
        <span className="relative z-10 text-base" style={{ color: '#a37800' }}>★</span>
        <span
          className="relative z-10 font-black text-sm tracking-[0.3em] uppercase"
          style={{ color: '#7a5500' }}
        >
          GRANDE FINALE
        </span>
        <span className="relative z-10 text-base" style={{ color: '#a37800' }}>★</span>
      </div>
    );
  }
  return (
    <div
      className="px-5 py-2 font-bold text-xs tracking-[0.3em] uppercase"
      style={{ border: '2px solid #111', color: '#111' }}
    >
      {phase}
    </div>
  );
};

// ─────────────────────────────────────────────
// CandidatBadge — noir sur blanc, très lisible
// ─────────────────────────────────────────────

const CandidatBadge: React.FC<{ nom: string | null }> = ({ nom }) => {
  const [visible, setVisible] = useState(false);
  const [displayNom, setDisplayNom] = useState<string | null>(null);

  useEffect(() => {
    if (nom) {
      setDisplayNom(nom);
      setVisible(true);
    } else {
      setVisible(false);
      const t = setTimeout(() => setDisplayNom(null), 400);
      return () => clearTimeout(t);
    }
  }, [nom]);

  if (!displayNom) return null;

  return (
    <div
      className={`flex items-center gap-4 transition-all duration-400 ${
        visible ? 'candidat-enter opacity-100' : 'opacity-0 -translate-x-4'
      }`}
    >
      <div
        className="w-12 h-12 flex items-center justify-center text-lg font-black flex-shrink-0"
        style={{ border: '2px solid #222', color: '#444' }}
      >
        ◈
      </div>
      <div>
        <p className="text-xs tracking-[0.45em] uppercase leading-none mb-1.5 font-semibold"
          style={{ color: '#888' }}>
          CANDIDAT
        </p>
        <p
          className="font-black tracking-wider leading-none uppercase"
          style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', color: '#000' }}
        >
          {displayNom}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// LetterTile — version mode clair
// Fond blanc, bordure noire, ombre portée grise
// Correct = vert, Incorrect = rouge
// ─────────────────────────────────────────────

type TileStatus = 'pending' | 'correct' | 'incorrect';
type TileSize = 'sm' | 'md' | 'lg' | 'xl';

const TILE_SIZES: Record<TileSize, { box: string; font: string }> = {
  sm: { box: 'w-8 h-10',   font: 'text-sm' },
  md: { box: 'w-12 h-14',  font: 'text-xl' },
  lg: { box: 'w-16 h-20',  font: 'text-3xl' },
  xl: { box: 'w-20 h-24',  font: 'text-4xl' },
};

const LightLetterTile: React.FC<{
  letter: string;
  status?: TileStatus;
  size?: TileSize;
  index?: number;
}> = ({ letter, status = 'pending', size = 'xl', index = 0 }) => {
  const { box, font } = TILE_SIZES[size];

  const borderColor =
    status === 'correct'   ? '#16a34a' :
    status === 'incorrect' ? '#dc2626' :
    '#111';

  const textColor =
    status === 'correct'   ? '#16a34a' :
    status === 'incorrect' ? '#dc2626' :
    '#000';

  const shadow =
    status === 'correct'   ? '3px 4px 0 #86efac' :
    status === 'incorrect' ? '3px 4px 0 #fca5a5' :
    '3px 4px 0 #bbb';

  return (
    <div
      className={`${box} ${font} flex items-center justify-center font-black uppercase letter-tile-enter`}
      style={{
        border: `2px solid ${borderColor}`,
        color: textColor,
        background: '#fff',
        boxShadow: shadow,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {letter}
    </div>
  );
};

// ─────────────────────────────────────────────
// RevelationPanel — mode clair
// ─────────────────────────────────────────────

const RevelationPanel: React.FC<{
  motCorrect: string;
  definition: string;
  isCorrect: boolean;
}> = ({ motCorrect, definition, isCorrect }) => {
  const borderColor = isCorrect ? '#16a34a' : '#dc2626';
  const statusColor = isCorrect ? '#16a34a' : '#dc2626';
  const statusText  = isCorrect ? '✓ CORRECT' : '✗ INCORRECT';
  const sepColor    = isCorrect ? '#86efac' : '#fca5a5';

  return (
    <div
      className="reveal-panel-enter flex flex-col items-center gap-8 w-full max-w-4xl p-14"
      style={{ border: `3px solid ${borderColor}`, background: '#fff' }}
    >
      {/* Statut */}
      <div
        className="font-black tracking-[0.25em] uppercase"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: statusColor }}
      >
        {statusText}
      </div>

      <div style={{ width: 80, height: 3, background: sepColor }} />

      {/* Mot correct */}
      <div className="text-center">
        <p className="text-sm tracking-[0.5em] uppercase mb-4 font-bold" style={{ color: '#999' }}>
          ORTHOGRAPHE CORRECTE
        </p>
        <p
          className="font-black tracking-widest uppercase"
          style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', color: '#000' }}
        >
          {motCorrect}
        </p>
      </div>

      <div style={{ width: 80, height: 1.5, background: '#e5e5e5' }} />

      {/* Définition */}
      <div className="text-center max-w-2xl">
        <p className="text-sm tracking-[0.5em] uppercase mb-3 font-bold" style={{ color: '#999' }}>
          DÉFINITION
        </p>
        <p className="text-2xl leading-relaxed font-light" style={{ color: '#222' }}>
          {definition}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Scoreboard — mode clair
// Candidat actif = fond noir / texte blanc
// ─────────────────────────────────────────────

const Scoreboard: React.FC<{
  candidates: Candidate[];
  candidatActifId: string | null;
}> = ({ candidates, candidatActifId }) => {
  const sorted = [...candidates].sort((a, b) => b.score - a.score).slice(0, 8);
  return (
    <div className="flex flex-col gap-2 w-full">
      {sorted.map((c, i) => {
        const isActive = c.id === candidatActifId;
        return (
          <div
            key={c.id}
            className="flex items-center justify-between px-3 py-2.5 transition-all duration-300"
            style={{
              border: isActive ? '1.5px solid #000' : '1.5px solid #ddd',
              background: isActive ? '#000' : '#fff',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm w-5 tabular-nums" style={{ color: isActive ? 'rgba(255,255,255,.4)' : '#bbb' }}>
                {i + 1}
              </span>
              <span
                className="font-bold tracking-wide truncate max-w-28"
                style={{
                  color: isActive ? '#fff' : '#555',
                  fontSize: isActive ? '1.05rem' : '0.9rem',
                }}
              >
                {c.nom}
              </span>
            </div>
            <span
              className="font-black tabular-nums"
              style={{
                color: isActive ? '#fff' : '#999',
                fontSize: isActive ? '1.3rem' : '1rem',
              }}
            >
              {c.score}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────
// Filigrane de lettres en arrière-plan
// ─────────────────────────────────────────────

const BgLetters: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[
      { l: 'É', style: { fontSize: '38vw', left: '-3%',  top: '2%',  opacity: 0.04, fontWeight: 900 } },
      { l: 'M', style: { fontSize: '28vw', left: '60%',  top: '-8%', opacity: 0.03, fontWeight: 900 } },
      { l: 'O', style: { fontSize: '22vw', left: '36%',  top: '50%', opacity: 0.035, fontWeight: 900 } },
      { l: 'I', style: { fontSize: '18vw', left: '13%',  top: '42%', opacity: 0.03, fontWeight: 900 } },
    ].map(({ l, style }) => (
      <div
        key={l}
        className="absolute leading-none select-none"
        style={{ color: '#000', ...style }}
      >
        {l}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// Vue principale
// ─────────────────────────────────────────────

const PublicView: React.FC = () => {
  const [competition, setCompetition] = useState<CompetitionState | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(true);

  // Chargement initial (état existant avant ouverture de /public)
  useEffect(() => {
    supabaseService.competition.getState().then((s) => { if (s) setCompetition(s); });
    supabaseService.candidates.getAll().then((c) => { if (c.length > 0) setCandidates(c); });
  }, []);

  // Mises à jour temps réel
  useRealtime(
    (state) => setCompetition(state),
    (cands) => setCandidates(cands)
  );

  // Touche S — toggle classement (discret pour l'opérateur)
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 's' || e.key === 'S') setShowScoreboard((v) => !v);
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Dérivés
  const candidatActif   = candidates.find((c) => c.id === competition?.candidatActifId) ?? null;
  const lettresSaisies  = competition?.lettresSaisies ?? '';
  const motAttendu      = competition?.motActuel?.mot ?? '';
  const letterStatuses  = useLetterStatus(lettresSaisies, motAttendu);
  const status          = competition?.status ?? 'en_attente';
  const isRevelation    = status === 'revelation';
  const showLetterTiles = ['en_cours', 'correct', 'incorrect'].includes(status) && lettresSaisies.length > 0;
  const showFinalColors = status === 'correct' || status === 'incorrect';
  const wasCorrect      = lettresSaisies === motAttendu;
  const tileSize: TileSize = lettresSaisies.length > 12 ? 'md' : lettresSaisies.length > 8 ? 'lg' : 'xl';
  const phaseLabel      = competition ? PHASE_LABELS[competition.phase] : '';
  const isFinale        = competition?.phase === 'finale';

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{ background: '#f5f2ed' }}
    >
      {/* Filigrane */}
      <BgLetters />

      {/* Corps */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">

        {/* Zone centrale */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Header ── grid 3 colonnes pour centrage parfait */}
          <div
            className="grid grid-cols-3 items-center px-8 pt-6 pb-3 gap-2"
            style={{ borderBottom: '1px solid rgba(0,0,0,.08)' }}
          >
            {/* Gauche : candidat */}
            <div className="flex justify-start min-w-0">
              <CandidatBadge nom={candidatActif?.nom ?? null} />
            </div>

            {/* Centre : titre */}
            <div className="flex flex-col items-center text-center">
              <p className="text-xs tracking-[0.55em] uppercase mb-1 font-light" style={{ color: '#aaa' }}>
                CONCOURS
              </p>
              <h1 className="font-black uppercase leading-none">
                <span className="block text-2xl tracking-[0.2em]" style={{ color: '#111' }}>ÉPELLE</span>
                <span className="block text-5xl tracking-[0.12em]" style={{ color: '#000' }}>MOI</span>
              </h1>
            </div>

            {/* Droite : phase */}
            <div className="flex justify-end min-w-0">
              {competition && !isFinale && (
                <PhaseBadge phase={phaseLabel} isFinale={false} />
              )}
            </div>
          </div>

          {/* Badge FINALE centré sous le header */}
          {isFinale && (
            <div className="flex justify-center pt-2 pb-1">
              <PhaseBadge phase={phaseLabel} isFinale={true} />
            </div>
          )}

          {/* ── Contenu principal ── */}
          <div className="flex-1 flex items-center justify-center px-10 min-h-0">
            <div className="flex flex-col items-center gap-10 w-full">

              {/* CAS 1 : Révélation */}
              {isRevelation && competition?.motActuel ? (
                <RevelationPanel
                  motCorrect={competition.motActuel.mot}
                  definition={competition.motActuel.definition}
                  isCorrect={wasCorrect}
                />
              ) : (
                <>
                  {/* CAS 2 : Tuiles de lettres */}
                  {showLetterTiles && (
                    <div className="letters-container flex gap-3 flex-wrap justify-center">
                      {lettresSaisies.split('').map((letter, i) => (
                        <LightLetterTile
                          key={`${i}-${letter}`}
                          letter={letter}
                          status={showFinalColors ? letterStatuses[i] : 'pending'}
                          size={tileSize}
                          index={i}
                        />
                      ))}
                    </div>
                  )}

                  {/* CAS 3 : EN ATTENTE */}
                  {status === 'en_attente' && (
                    <div className="flex flex-col items-center gap-5">
                      <p
                        className="font-black tracking-[0.25em] uppercase"
                        style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', color: '#222' }}
                      >
                        EN ATTENTE
                      </p>
                      <p
                        className="text-sm tracking-[0.5em] uppercase font-semibold animate-pulse"
                        style={{ color: '#aaa' }}
                      >
                        EN ATTENTE DE LA PREMIÈRE LETTRE
                      </p>
                    </div>
                  )}

                  {/* CAS 4 : CORRECT sans lettres */}
                  {status === 'correct' && !showLetterTiles && (
                    <p
                      className="font-black tracking-[0.25em] animate-pulse-once"
                      style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', color: '#16a34a' }}
                    >
                      ✓ CORRECT
                    </p>
                  )}

                  {/* CAS 5 : INCORRECT sans lettres */}
                  {status === 'incorrect' && !showLetterTiles && (
                    <p
                      className="font-black tracking-[0.25em] animate-shake"
                      style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', color: '#dc2626' }}
                    >
                      ✗ INCORRECT
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Classement masquable ── */}
        {candidates.length > 0 && (
          <div
            className={`flex flex-col py-8 transition-all duration-500 overflow-hidden flex-shrink-0 ${
              showScoreboard ? 'w-64 px-5 opacity-100' : 'w-0 opacity-0 px-0'
            }`}
            style={{ borderLeft: '2px solid #e0ddd8', background: '#ede9e3' }}
          >
            {showScoreboard && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs tracking-[0.5em] uppercase font-bold" style={{ color: '#aaa' }}>
                    CLASSEMENT
                  </p>
                  <button
                    onClick={() => setShowScoreboard(false)}
                    title="Masquer (touche S)"
                    className="transition-colors text-lg leading-none"
                    style={{ color: '#ccc' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#555')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                  >
                    ✕
                  </button>
                </div>
                <Scoreboard
                  candidates={candidates}
                  candidatActifId={competition?.candidatActifId ?? null}
                />
              </>
            )}
          </div>
        )}

        {/* Bouton réafficher le classement */}
        {candidates.length > 0 && !showScoreboard && (
          <button
            onClick={() => setShowScoreboard(true)}
            title="Afficher le classement (touche S)"
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-all px-2 py-5 text-xs tracking-widest uppercase z-20"
            style={{
              border: '1.5px solid #ccc',
              color: '#aaa',
              writingMode: 'vertical-rl',
              background: '#ede9e3',
            }}
          >
            CLASSEMENT
          </button>
        )}
      </div>

      {/* ── Ticker sponsors ── */}
      <SponsorsTicker />
    </div>
  );
};

export default PublicView;