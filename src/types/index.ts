/**
 * @file types/index.ts
 * @description Modèles de données centraux de l'application Épelle-Moi.
 * Correspond directement aux modèles Flutter : Candidate, Word, Phase.
 */

// ─────────────────────────────────────────────
// PHASE — Cycle de vie d'un concours
// ─────────────────────────────────────────────

export type Phase =
  | 'qualifications'
  | 'eliminatoires'
  | 'demi-finale'
  | 'finale';

export const PHASE_LABELS: Record<Phase, string> = {
  qualifications: 'Qualifications',
  eliminatoires: 'Éliminatoires',
  'demi-finale': 'Demi-Finale',
  finale: 'Finale',
};

/** Temps alloué (en secondes) par phase */
export const PHASE_TIME_LIMITS: Record<Phase, number> = {
  qualifications: 60,
  eliminatoires: 45,
  'demi-finale': 30,
  finale: 30,
};

// ─────────────────────────────────────────────
// WORD — Unité linguistique riche
// ─────────────────────────────────────────────

export interface Word {
  /** Identifiant unique (UUID généré à l'import) */
  id: string;

  /** Orthographe officielle du mot */
  mot: string;

  /** Définition affichée à l'admin */
  definition: string;

  /** Phrase d'exemple contextuelle */
  exemple: string;

  /** Nature grammaticale ex: "Nom (M)", "Verbe" */
  nature: string;

  /** Étymologie / origine du mot */
  etymologie: string;

  /** Prononciation phonétique */
  prononciation: string;

  /** Niveau de difficulté de 1 (facile) à 5 (expert) */
  niveau: 1 | 2 | 3 | 4 | 5;

  /** Catégorie thématique ex: "Sciences", "CG (Culture Générale)" */
  categorie: string;

  /** Vrai si le mot a déjà été utilisé dans cette session */
  estUtilise: boolean;
}

/**
 * Correspondance entre les colonnes CSV et les champs Word.
 * Adapter selon la structure exacte du fichier CSV fourni.
 */
export const CSV_COLUMN_MAP: Record<keyof Omit<Word, 'id' | 'estUtilise'>, string> = {
  mot: 'mot',
  definition: 'definition',
  exemple: 'exemple',
  nature: 'nature',
  etymologie: 'etymologie',
  prononciation: 'prononciation',
  niveau: 'niveau',
  categorie: 'categorie',
};

// ─────────────────────────────────────────────
// CANDIDATE — Participant au concours
// ─────────────────────────────────────────────

export interface Candidate {
  /** Identifiant unique UUID */
  id: string;

  /** Numéro ou prénom affiché publiquement */
  nom: string;

  /** Score cumulé sur la session */
  score: number;

  /** Vrai si qualifié pour la phase suivante */
  estQualifie: boolean;

  /** Temps restant personnel (en secondes) */
  tempsRestant: number;

  /** Rang calculé dynamiquement */
  rang?: number;
}

// ─────────────────────────────────────────────
// COMPETITION STATE — État global en temps réel
// ─────────────────────────────────────────────

export type CompetitionStatus =
  | 'en_attente'      // Aucun candidat actif
  | 'en_cours'        // Épellation en cours
  | 'correct'         // Mot validé ✓
  | 'incorrect'       // Mot invalide ✗
  | 'revelation';     // Affichage de la réponse

export interface CompetitionState {
  /** Phase actuelle du concours */
  phase: Phase;

  /** Statut de la session courante */
  status: CompetitionStatus;

  /** ID du candidat actuellement en jeu */
  candidatActifId: string | null;

  /** Mot actuellement soumis à épellation */
  motActuel: Word | null;

  /** Lettres saisies jusqu'ici par l'admin */
  lettresSaisies: string;

  /** Vrai si le chronomètre tourne */
  chronoActif: boolean;

  /** Temps restant en secondes pour le mot actuel */
  tempsRestant: number;

  /** Vrai si le chronomètre global (3 min) tourne */
  globalChronoActif: boolean;

  /** Temps restant en secondes pour le chronomètre global */
  globalChronoTemps: number;
}

// ─────────────────────────────────────────────
// CSV IMPORT — Résultat du parsing
// ─────────────────────────────────────────────

export interface CsvImportResult {
  success: boolean;
  wordsImported: number;
  errors: string[];
  words: Word[];
}

// ─────────────────────────────────────────────
// ANALYTICS — Dashboard post-compétition
// ─────────────────────────────────────────────

export interface CategoryStat {
  categorie: string;
  total: number;
  utilises: number;
  pourcentage: number;
}

export interface CompetitionAnalytics {
  totalMots: number;
  motsUtilises: number;
  totalCandidats: number;
  scoreMax: number;
  scoreMoyen: number;
  categorieStats: CategoryStat[];
  topCandidats: Candidate[];
}
