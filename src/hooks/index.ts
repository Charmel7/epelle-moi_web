/**
 * @file hooks/index.ts
 * @description Hooks React personnalisés de l'application.
 *
 * - useChrono        : Chronomètre adaptatif synchronisé avec le store
 * - useRealtime      : Abonnement Supabase pour la vue publique
 * - useKeyboard      : Capture clavier pour l'interface admin
 * - useLetterStatus  : Calcule l'état visuel de chaque lettre saisie
 */

import { useEffect, useRef, useCallback } from 'react';
import supabaseService from '../services/supabaseService';
import useCompetitionStore from '../store/useCompetitionStore';
import type { CompetitionState, Candidate } from '../types';

// ─────────────────────────────────────────────
// useChrono
// ─────────────────────────────────────────────

/**
 * Gère le décompte du chronomètre côté admin.
 * S'active quand competition.chronoActif = true.
 * Appelle tickChrono() chaque seconde.
 *
 * @example
 * // Dans le composant Admin, simplement :
 * useChrono();
 */
export function useChrono(): void {
  const chronoActif = useCompetitionStore((s) => s.competition.chronoActif);
  const globalChronoActif = useCompetitionStore((s) => s.competition.globalChronoActif);
  const anyChronoActif = chronoActif || globalChronoActif;
  const tickChrono = useCompetitionStore((s) => s.tickChrono);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (anyChronoActif) {
      intervalRef.current = setInterval(() => {
        tickChrono();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [anyChronoActif, tickChrono]);
}

// ─────────────────────────────────────────────
// useRealtime
// ─────────────────────────────────────────────

/**
 * Abonne la vue publique aux mises à jour Supabase en temps réel.
 * À utiliser UNIQUEMENT dans la vue /public.
 *
 * Reçoit les changements de :
 * - CompetitionState (lettres, status, mot actuel)
 * - Candidates (scores mis à jour)
 *
 * @param onCompetitionUpdate - Callback appelé à chaque changement d'état
 * @param onCandidatesUpdate  - Callback appelé à chaque changement de scores
 *
 * @example
 * useRealtime(
 *   (state) => setCompetition(state),
 *   (candidates) => setCandidates(candidates)
 * );
 */
export function useRealtime(
  onCompetitionUpdate: (state: CompetitionState) => void,
  onCandidatesUpdate: (candidates: Candidate[]) => void
): void {
  useEffect(() => {
    const competitionChannel = supabaseService.realtime.subscribeToCompetition(
      onCompetitionUpdate
    );
    const candidatesChannel = supabaseService.realtime.subscribeToCandidates(
      onCandidatesUpdate
    );

    return () => {
      competitionChannel.unsubscribe();
      candidatesChannel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─────────────────────────────────────────────
// useKeyboard
// ─────────────────────────────────────────────

/**
 * Capture les événements clavier pour l'interface admin.
 * - Lettres A-Z : ajoute à l'épellation
 * - Backspace   : efface la dernière lettre
 * - Escape      : efface tout
 * - Enter       : shortcut pour "Correct"
 *
 * @param enabled - Désactiver si un champ texte est focused
 *
 * @example
 * const inputFocused = useRef(false);
 * useKeyboard(!inputFocused.current);
 */
export function useKeyboard(enabled: boolean = true): void {
  const lettresSaisies = useCompetitionStore((s) => s.competition.lettresSaisies);
  const updateLettres = useCompetitionStore((s) => s.updateLettres);
  const effacerLettres = useCompetitionStore((s) => s.effacerLettres);
  const validerCorrect = useCompetitionStore((s) => s.validerCorrect);
  const motActuel = useCompetitionStore((s) => s.competition.motActuel);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !motActuel) return;

      // Ignorer si un input est focused
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
        updateLettres(lettresSaisies + e.key);
      } else if (e.key === 'Backspace') {
        updateLettres(lettresSaisies.slice(0, -1));
      } else if (e.key === 'Escape') {
        effacerLettres();
      } else if (e.key === 'Enter') {
        validerCorrect();
      }
    },
    [enabled, motActuel, lettresSaisies, updateLettres, effacerLettres, validerCorrect]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ─────────────────────────────────────────────
// useLetterStatus
// ─────────────────────────────────────────────

/**
 * Calcule l'état visuel de chaque lettre saisie par rapport au mot attendu.
 * Utilisé pour le feedback couleur sur l'écran de projection.
 *
 * @param lettresSaisies - Chaîne des lettres entrées par l'admin
 * @param motAttendu     - Le mot correct à épeler
 * @returns Tableau de statuts par lettre : 'correct' | 'incorrect' | 'pending'
 *
 * @example
 * const statuts = useLetterStatus('HESP', 'HESPER');
 * // → ['correct', 'correct', 'correct', 'correct']
 */
export type LetterStatus = 'correct' | 'incorrect' | 'pending';

export function useLetterStatus(
  lettresSaisies: string,
  motAttendu: string
): LetterStatus[] {
  return lettresSaisies.split('').map((lettre, index) => {
    if (index >= motAttendu.length) return 'incorrect';
    if (lettre === motAttendu[index]) return 'correct';
    return 'incorrect';
  });
}

// ─────────────────────────────────────────────
// useSound
// ─────────────────────────────────────────────

/**
 * Retours sonores via Web Audio API (aucune dépendance externe).
 * Génère des tons synthétiques pour les événements clés.
 *
 * @returns Objet avec les méthodes playSuccess et playError
 *
 * @example
 * const { playSuccess, playError } = useSound();
 * // Appeler dans validerCorrect / validerIncorrect
 */
export function useSound() {
  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = 'sine') => {
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      } catch {
        // AudioContext non disponible (ex: test unitaire)
      }
    },
    []
  );

  const playSuccess = useCallback(() => {
    playTone(523, 0.15); // Do
    setTimeout(() => playTone(659, 0.15), 150); // Mi
    setTimeout(() => playTone(784, 0.3), 300);  // Sol
  }, [playTone]);

  const playError = useCallback(() => {
    playTone(220, 0.4, 'sawtooth');
  }, [playTone]);

  return { playSuccess, playError };
}
