/**
 * @file store/useCompetitionStore.ts
 * @description Store Zustand — Source de vérité locale de l'application.
 *
 * Architecture :
 * - État local synchronisé avec Supabase via les services
 * - Les actions encapsulent TOUTE la logique métier (pas de logique dans les composants)
 * - Les sélecteurs permettent des re-renders optimisés
 *
 * Flux de données :
 *   Composant → action() → supabaseService → Supabase DB
 *                                         ↓ (realtime)
 *   Vue Publique ← subscribeToCompetition ←────────────
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import supabaseService from '../services/supabaseService';
import csvService from '../services/csvService';
import type {
  Word,
  Candidate,
  CompetitionState,
  Phase,
  CsvImportResult,
} from '../types';
import { PHASE_TIME_LIMITS } from '../types';

// ─────────────────────────────────────────────
// État initial
// ─────────────────────────────────────────────

const INITIAL_COMPETITION_STATE: CompetitionState = {
  phase: 'qualifications',
  status: 'en_attente',
  candidatActifId: null,
  motActuel: null,
  lettresSaisies: '',
  chronoActif: false,
  tempsRestant: PHASE_TIME_LIMITS['qualifications'],
};

// ─────────────────────────────────────────────
// Types du store
// ─────────────────────────────────────────────

interface CompetitionStore {
  // ── État ──────────────────────────────────
  competition: CompetitionState;
  candidates: Candidate[];
  words: Word[];
  isLoading: boolean;
  error: string | null;

  // ── Actions : Initialisation ──────────────

  /** Charge l'état initial depuis Supabase (appelé au montage de l'app) */
  initialize: () => Promise<void>;

  // ── Actions : Mots ────────────────────────

  /**
   * Importe un fichier CSV, parse les mots et les envoie en DB.
   * @returns Résultat du parsing pour afficher le feedback à l'admin
   */
  importCsv: (file: File) => Promise<CsvImportResult>;

  /**
   * Tire aléatoirement un mot non utilisé du niveau approprié.
   * Marque immédiatement le mot comme utilisé en DB.
   */
  tirerMotSuivant: () => Promise<void>;

  // ── Actions : Candidats ───────────────────

  /**
   * Ajoute un candidat avec un UUID généré côté client.
   * @param nom - Nom ou numéro du candidat
   */
  ajouterCandidat: (nom: string) => Promise<void>;

  /** Supprime un candidat par son ID */
  supprimerCandidat: (id: string) => Promise<void>;

  /**
   * Définit le candidat actif pour la session courante.
   * Met à jour Supabase → déclenche le realtime sur la vue publique.
   */
  setCandidatActif: (id: string) => Promise<void>;

  // ── Actions : Épellation ─────────────────

  /**
   * Mise à jour des lettres saisies.
   * Propagée en temps réel via Supabase pour l'écran de projection.
   * @param lettres - Chaîne complète des lettres saisies
   */
  updateLettres: (lettres: string) => Promise<void>;

  /** Efface toutes les lettres saisies */
  effacerLettres: () => Promise<void>;

  // ── Actions : Validation ─────────────────

  /**
   * Valide l'épellation comme CORRECTE.
   * - Incrémente le score du candidat actif (+1)
   * - Met le status à 'correct'
   * - Stoppe le chronomètre
   */
  validerCorrect: () => Promise<void>;

  /**
   * Valide l'épellation comme INCORRECTE.
   * - Ne modifie pas le score
   * - Met le status à 'incorrect'
   * - Stoppe le chronomètre
   */
  validerIncorrect: () => Promise<void>;

  /** Révèle le mot correct sur l'écran de projection */
  reveler: () => Promise<void>;

  // ── Actions : Phase ───────────────────────

  /** Change la phase du concours et réinitialise le timer */
  setPhase: (phase: Phase) => Promise<void>;

  // ── Actions : Chronomètre ─────────────────

  /** Démarre le chronomètre (appelé à la première lettre) */
  startChrono: () => Promise<void>;

  /** Arrête le chronomètre */
  stopChrono: () => Promise<void>;

  /** Décrémente le temps restant (appelé par un interval local) */
  tickChrono: () => void;

  // ── Actions : Reset ───────────────────────

  /** Réinitialise la session (nouveau candidat, efface lettres, status en_attente) */
  resetSession: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Store Zustand
// ─────────────────────────────────────────────

const useCompetitionStore = create<CompetitionStore>()(
  devtools(
    (set, get) => ({
      // ── État initial ──────────────────────
      competition: INITIAL_COMPETITION_STATE,
      candidates: [],
      words: [],
      isLoading: false,
      error: null,

      // ─────────────────────────────────────
      // INITIALISATION
      // ─────────────────────────────────────

      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          const [state, candidates, words] = await Promise.all([
            supabaseService.competition.getState(),
            supabaseService.candidates.getAll(),
            supabaseService.words.getAll(),
          ]);

          set({
            competition: state ?? INITIAL_COMPETITION_STATE,
            candidates,
            words,
            isLoading: false,
          });
        } catch (err) {
          set({ error: String(err), isLoading: false });
        }
      },

      // ─────────────────────────────────────
      // MOTS
      // ─────────────────────────────────────

      importCsv: async (file: File): Promise<CsvImportResult> => {
        const result = await csvService.parseFile(file);
        if (result.success && result.words.length > 0) {
          await supabaseService.words.upsertMany(result.words);
          set({ words: result.words });
        }
        return result;
      },

      tirerMotSuivant: async () => {
        const { words, competition } = get();

        // Filtrer les mots disponibles selon la phase
        const disponibles = words.filter((w) => !w.estUtilise);
        if (disponibles.length === 0) return;

        // Tirage aléatoire
        const mot = disponibles[Math.floor(Math.random() * disponibles.length)];

        // Marquer utilisé en DB
        await supabaseService.words.markAsUsed(mot.id);

        // Mettre à jour le store local
        set((state) => ({
          words: state.words.map((w) =>
            w.id === mot.id ? { ...w, estUtilise: true } : w
          ),
        }));

        // Mettre à jour l'état de compétition
        const newState: Partial<CompetitionState> = {
          motActuel: mot,
          lettresSaisies: '',
          status: 'en_attente',
          tempsRestant: PHASE_TIME_LIMITS[competition.phase],
          chronoActif: false,
        };
        await supabaseService.competition.updateState(newState);
        set((state) => ({ competition: { ...state.competition, ...newState } }));
      },

      // ─────────────────────────────────────
      // CANDIDATS
      // ─────────────────────────────────────

      ajouterCandidat: async (nom: string) => {
        const newCandidat: Omit<Candidate, 'rang'> = {
          id: uuidv4(),
          nom,
          score: 0,
          estQualifie: false,
          tempsRestant: PHASE_TIME_LIMITS[get().competition.phase],
        };
        const added = await supabaseService.candidates.add(newCandidat);
        set((state) => ({
          candidates: [...state.candidates, added],
        }));
      },

      supprimerCandidat: async (id: string) => {
        await supabaseService.candidates.remove(id);
        set((state) => ({
          candidates: state.candidates.filter((c) => c.id !== id),
        }));
      },

      setCandidatActif: async (id: string) => {
        const updates: Partial<CompetitionState> = {
          candidatActifId: id,
          status: 'en_attente',
          lettresSaisies: '',
        };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      // ─────────────────────────────────────
      // ÉPELLATION
      // ─────────────────────────────────────

      updateLettres: async (lettres: string) => {
        const updates: Partial<CompetitionState> = {
          lettresSaisies: lettres.toUpperCase(),
          status: 'en_cours',
        };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));

        // Démarrer le chrono à la première lettre
        if (lettres.length === 1 && !get().competition.chronoActif) {
          await get().startChrono();
        }
      },

      effacerLettres: async () => {
        const updates: Partial<CompetitionState> = { lettresSaisies: '' };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      // ─────────────────────────────────────
      // VALIDATION
      // ─────────────────────────────────────

      validerCorrect: async () => {
        const { competition, candidates } = get();
        const candidatId = competition.candidatActifId;

        // Incrémenter le score
        if (candidatId) {
          const candidat = candidates.find((c) => c.id === candidatId);
          if (candidat) {
            const newScore = candidat.score + 1;
            await supabaseService.candidates.updateScore(candidatId, newScore);
            set((state) => ({
              candidates: state.candidates.map((c) =>
                c.id === candidatId ? { ...c, score: newScore } : c
              ),
            }));
          }
        }

        const updates: Partial<CompetitionState> = {
          status: 'correct',
          chronoActif: false,
        };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      validerIncorrect: async () => {
        const updates: Partial<CompetitionState> = {
          status: 'incorrect',
          chronoActif: false,
        };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      reveler: async () => {
        const updates: Partial<CompetitionState> = { status: 'revelation' };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      // ─────────────────────────────────────
      // PHASE
      // ─────────────────────────────────────

      setPhase: async (phase: Phase) => {
        const updates: Partial<CompetitionState> = {
          phase,
          tempsRestant: PHASE_TIME_LIMITS[phase],
        };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      // ─────────────────────────────────────
      // CHRONOMÈTRE
      // ─────────────────────────────────────

      startChrono: async () => {
        const updates: Partial<CompetitionState> = { chronoActif: true };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      stopChrono: async () => {
        const updates: Partial<CompetitionState> = { chronoActif: false };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },

      tickChrono: () => {
        set((state) => {
          const newTime = state.competition.tempsRestant - 1;
          if (newTime <= 0) {
            // Temps écoulé → valider comme incorrect automatiquement
            get().validerIncorrect();
            return state;
          }
          return {
            competition: { ...state.competition, tempsRestant: newTime },
          };
        });
      },

      // ─────────────────────────────────────
      // RESET
      // ─────────────────────────────────────

      resetSession: async () => {
        const updates: Partial<CompetitionState> = {
          status: 'en_attente',
          candidatActifId: null,
          lettresSaisies: '',
          chronoActif: false,
          tempsRestant: PHASE_TIME_LIMITS[get().competition.phase],
        };
        await supabaseService.competition.updateState(updates);
        set((state) => ({ competition: { ...state.competition, ...updates } }));
      },
    }),
    { name: 'epelle-moi-store' }
  )
);

// ─────────────────────────────────────────────
// Sélecteurs optimisés (évitent les re-renders inutiles)
// ─────────────────────────────────────────────

export const selectCandidatActif = (state: CompetitionStore) =>
  state.candidates.find((c) => c.id === state.competition.candidatActifId) ?? null;

export const selectMotsDisponibles = (state: CompetitionStore) =>
  state.words.filter((w) => !w.estUtilise);

export const selectScoreboard = (state: CompetitionStore) =>
  [...state.candidates].sort((a, b) => b.score - a.score).map((c, i) => ({
    ...c,
    rang: i + 1,
  }));

export default useCompetitionStore;
