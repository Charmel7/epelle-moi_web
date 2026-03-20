/**
 * @file services/supabaseService.ts
 * @description Point d'entrée unique pour TOUS les appels Supabase.
 *
 * Architecture :
 * - Un seul client Supabase instancié ici (singleton)
 * - Toutes les tables sont définies comme constantes
 * - Chaque méthode est documentée avec sa table cible et son comportement
 * - Les erreurs sont normalisées via handleError()
 *
 * Tables Supabase requises :
 *   - `words`       : colonnes selon Word interface
 *   - `candidates`  : colonnes selon Candidate interface
 *   - `competition` : état global (1 seule ligne, id = 'current')
 *
 * @example
 * // Initialiser la DB avec les mots importés
 * await supabaseService.words.upsertMany(parsedWords);
 *
 * // Écouter les changements en temps réel (vue publique)
 * supabaseService.realtime.subscribeToCompetition(callback);
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Word, Candidate, CompetitionState } from '../types';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Noms des tables en base */
const TABLES = {
  WORDS: 'words',
  CANDIDATES: 'candidates',
  COMPETITION: 'competition',
} as const;

/** ID de la ligne d'état global de la compétition */
const COMPETITION_ROW_ID = 'current';

// ─────────────────────────────────────────────
// Client singleton
// ─────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        '[SupabaseService] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env'
      );
    }
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

// ─────────────────────────────────────────────
// Gestion d'erreurs centralisée
// ─────────────────────────────────────────────

function handleError(context: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[SupabaseService][${context}]`, message);
  throw new Error(`[${context}] ${message}`);
}

// ─────────────────────────────────────────────
// Service : WORDS
// ─────────────────────────────────────────────

const wordsService = {
  /**
   * Charge tous les mots non utilisés pour une session.
   * Utilisé au démarrage de chaque phase.
   */
  async getAvailable(): Promise<Word[]> {
    const { data, error } = await getClient()
      .from(TABLES.WORDS)
      .select('*')
      .eq('estUtilise', false)
      .order('niveau', { ascending: true });

    if (error) handleError('words.getAvailable', error);
    return data as Word[];
  },

  /**
   * Charge tous les mots (utilisés ou non) — pour le dashboard.
   */
  async getAll(): Promise<Word[]> {
    const { data, error } = await getClient()
      .from(TABLES.WORDS)
      .select('*')
      .order('categorie', { ascending: true });

    if (error) handleError('words.getAll', error);
    return data as Word[];
  },

  /**
   * Insère ou remplace en masse les mots depuis le CSV importé.
   * Utilise upsert pour éviter les doublons sur le champ `mot`.
   *
   * @param words - Tableau de mots parsés depuis le CSV
   */
  async upsertMany(words: Word[]): Promise<void> {
    // Insérer par batch de 500 pour éviter les timeouts
    const BATCH_SIZE = 500;
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      const { error } = await getClient()
        .from(TABLES.WORDS)
        .upsert(batch, { onConflict: 'mot' });

      if (error) handleError('words.upsertMany', error);
    }
  },

  /**
   * Marque un mot comme utilisé dans la base.
   * Appelé dès qu'un mot est tiré, empêche tout doublon futur.
   *
   * @param wordId - UUID du mot à marquer
   */
  async markAsUsed(wordId: string): Promise<void> {
    const { error } = await getClient()
      .from(TABLES.WORDS)
      .update({ estUtilise: true })
      .eq('id', wordId);

    if (error) handleError('words.markAsUsed', error);
  },

  /**
   * Réinitialise tous les mots (estUtilise → false).
   * Utilisé en début de nouveau concours.
   */
  async resetAll(): Promise<void> {
    const { error } = await getClient()
      .from(TABLES.WORDS)
      .update({ estUtilise: false })
      .neq('id', ''); // Filtre universel

    if (error) handleError('words.resetAll', error);
  },
};

// ─────────────────────────────────────────────
// Service : CANDIDATES
// ─────────────────────────────────────────────

const candidatesService = {
  /**
   * Récupère tous les candidats triés par score décroissant.
   */
  async getAll(): Promise<Candidate[]> {
    const { data, error } = await getClient()
      .from(TABLES.CANDIDATES)
      .select('*')
      .order('score', { ascending: false });

    if (error) handleError('candidates.getAll', error);
    return (data as Candidate[]).map((c, i) => ({ ...c, rang: i + 1 }));
  },

  /**
   * Ajoute un nouveau candidat.
   *
   * @param candidate - Candidat sans rang (calculé au retour)
   */
  async add(candidate: Omit<Candidate, 'rang'>): Promise<Candidate> {
    const { data, error } = await getClient()
      .from(TABLES.CANDIDATES)
      .insert(candidate)
      .select()
      .single();

    if (error) handleError('candidates.add', error);
    return data as Candidate;
  },

  /**
   * Met à jour le score d'un candidat.
   *
   * @param id - UUID du candidat
   * @param score - Nouveau score total
   */
  async updateScore(id: string, score: number): Promise<void> {
    const { error } = await getClient()
      .from(TABLES.CANDIDATES)
      .update({ score })
      .eq('id', id);

    if (error) handleError('candidates.updateScore', error);
  },

  /**
   * Supprime un candidat de la compétition.
   *
   * @param id - UUID du candidat
   */
  async remove(id: string): Promise<void> {
    const { error } = await getClient()
      .from(TABLES.CANDIDATES)
      .delete()
      .eq('id', id);

    if (error) handleError('candidates.remove', error);
  },

  /**
   * Supprime tous les candidats — reset complet.
   */
  async removeAll(): Promise<void> {
    const { error } = await getClient()
      .from(TABLES.CANDIDATES)
      .delete()
      .neq('id', '');

    if (error) handleError('candidates.removeAll', error);
  },
};

// ─────────────────────────────────────────────
// Service : COMPETITION STATE
// ─────────────────────────────────────────────

const competitionService = {
  /**
   * Lit l'état courant de la compétition.
   * La table `competition` ne contient qu'une seule ligne (id = 'current').
   */
  async getState(): Promise<CompetitionState | null> {
    const { data, error } = await getClient()
      .from(TABLES.COMPETITION)
      .select('*')
      .eq('id', COMPETITION_ROW_ID)
      .single();

    if (error && error.code !== 'PGRST116') handleError('competition.getState', error);
    return data as CompetitionState | null;
  },

  /**
   * Met à jour l'état de la compétition (merge partiel).
   * C'est le seul endroit où l'état global change.
   *
   * @param updates - Champs à mettre à jour (Partial<CompetitionState>)
   */
  async updateState(updates: Partial<CompetitionState>): Promise<void> {
    const { error } = await getClient()
      .from(TABLES.COMPETITION)
      .upsert({ id: COMPETITION_ROW_ID, ...updates });

    if (error) handleError('competition.updateState', error);
  },
};

// ─────────────────────────────────────────────
// Service : REALTIME (Vue publique)
// ─────────────────────────────────────────────

const realtimeService = {
  /**
   * Abonne la vue publique aux changements de l'état de compétition.
   * Chaque mise à jour admin est reçue en <100ms.
   *
   * @param callback - Fonction appelée à chaque changement d'état
   * @returns Canal à unsubscribe lors du démontage du composant
   *
   * @example
   * useEffect(() => {
   *   const channel = supabaseService.realtime.subscribeToCompetition(setState);
   *   return () => channel.unsubscribe();
   * }, []);
   */
  subscribeToCompetition(
    callback: (state: CompetitionState) => void
  ): RealtimeChannel {
    return getClient()
      .channel('competition-state')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.COMPETITION,
          filter: `id=eq.${COMPETITION_ROW_ID}`,
        },
        (payload) => {
          if (payload.new) callback(payload.new as CompetitionState);
        }
      )
      .subscribe();
  },

  /**
   * Abonne la vue publique aux changements du classement candidats.
   *
   * @param callback - Fonction appelée à chaque changement de score
   */
  subscribeToCandidates(
    callback: (candidates: Candidate[]) => void
  ): RealtimeChannel {
    return getClient()
      .channel('candidates-scores')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.CANDIDATES },
        async () => {
          // On recharge toute la liste pour avoir le tri correct
          const candidates = await candidatesService.getAll();
          callback(candidates);
        }
      )
      .subscribe();
  },
};

// ─────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────

const supabaseService = {
  words: wordsService,
  candidates: candidatesService,
  competition: competitionService,
  realtime: realtimeService,
};

export default supabaseService;
