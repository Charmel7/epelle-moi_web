/**
 * @file services/csvService.ts
 * @description Service de gestion des fichiers CSV.
 *
 * Responsabilités :
 * - Parser un fichier CSV en tableau de Word[]
 * - Gérer les erreurs de colonnes manquantes / valeurs invalides
 * - Exporter le tableau de mots (avec estUtilise) vers CSV
 * - Statistiques d'utilisation par catégorie
 *
 * @example
 * const result = await csvService.parseFile(file);
 * if (result.success) store.dispatch(setWords(result.words));
 */

import { v4 as uuidv4 } from 'uuid';
import type { Word, CsvImportResult, CategoryStat } from '../types';

// ─────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────

/**
 * Normalise un niveau CSV (string) en valeur 1–5.
 * Retourne 3 par défaut si la valeur est invalide.
 */
function parseNiveau(raw: string): Word['niveau'] {
  const n = parseInt(raw, 10);
  if (n >= 1 && n <= 5) return n as Word['niveau'];
  return 3;
}

/**
 * Parse une ligne CSV (tableau de cellules) en objet Word partiel.
 * Retourne null si les champs obligatoires (mot, definition) manquent.
 */
function parseRow(
  row: Record<string, string>,
  lineNumber: number
): { word: Word | null; error: string | null } {
  const mot = row['mot']?.trim();
  const definition = row['definition']?.trim();

  if (!mot) {
    return { word: null, error: `Ligne ${lineNumber} : colonne "mot" vide ou manquante` };
  }
  if (!definition) {
    return { word: null, error: `Ligne ${lineNumber} : colonne "definition" vide ou manquante` };
  }

  const word: Word = {
    id: uuidv4(),
    mot: mot.toUpperCase(),
    definition,
    exemple: row['exemple']?.trim() ?? '',
    nature: row['nature']?.trim() ?? '',
    etymologie: row['etymologie']?.trim() ?? '',
    prononciation: row['prononciation']?.trim() ?? '',
    niveau: parseNiveau(row['niveau'] ?? '3'),
    categorie: row['categorie']?.trim() ?? 'Non classé',
    estUtilise: row['estUtilise'] === 'true' || row['est_utilise'] === 'true',
  };

  return { word, error: null };
}

/**
 * Parse un contenu CSV brut (string) en tableau de lignes/colonnes.
 * Gère les guillemets, les virgules dans les cellules et les fins de ligne CRLF.
 */
function parseCsvContent(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  // Détecter le séparateur (virgule ou point-virgule)
  const separator = lines[0].includes(';') ? ';' : ',';

  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ''));

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parser simple avec gestion des guillemets
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

// ─────────────────────────────────────────────
// Service public
// ─────────────────────────────────────────────

const csvService = {
  /**
   * Parse un objet File CSV en liste de mots typés.
   *
   * @param file - Fichier sélectionné par l'utilisateur (input[type=file])
   * @returns CsvImportResult avec les mots valides et les erreurs rencontrées
   */
  async parseFile(file: File): Promise<CsvImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        const rows = parseCsvContent(content);

        const words: Word[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const { word, error } = parseRow(row, index + 2); // +2 car ligne 1 = header
          if (word) {
            words.push(word);
          } else if (error) {
            errors.push(error);
          }
        });

        resolve({
          success: words.length > 0,
          wordsImported: words.length,
          errors,
          words,
        });
      };

      reader.onerror = () => {
        resolve({
          success: false,
          wordsImported: 0,
          errors: ['Erreur de lecture du fichier.'],
          words: [],
        });
      };

      reader.readAsText(file, 'UTF-8');
    });
  },

  /**
   * Génère et déclenche le téléchargement d'un CSV à jour
   * (avec la colonne estUtilise mise à jour).
   *
   * @param words - Liste complète des mots à exporter
   * @param filename - Nom du fichier téléchargé (défaut: "epelle-moi-export.csv")
   */
  exportToCsv(words: Word[], filename = 'epelle-moi-export.csv'): void {
    const headers = [
      'mot', 'definition', 'exemple', 'nature',
      'etymologie', 'prononciation', 'niveau', 'categorie', 'estUtilise',
    ];

    const rows = words.map((w) =>
      [
        `"${w.mot}"`,
        `"${w.definition.replace(/"/g, '""')}"`,
        `"${w.exemple.replace(/"/g, '""')}"`,
        `"${w.nature}"`,
        `"${w.etymologie.replace(/"/g, '""')}"`,
        `"${w.prononciation}"`,
        w.niveau,
        `"${w.categorie}"`,
        w.estUtilise,
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  },

  /**
   * Calcule les statistiques d'utilisation par catégorie.
   *
   * @param words - Liste complète des mots
   * @returns Tableau de CategoryStat trié par nombre total décroissant
   */
  getCategoryStats(words: Word[]): CategoryStat[] {
    const map: Record<string, { total: number; utilises: number }> = {};

    words.forEach((w) => {
      if (!map[w.categorie]) map[w.categorie] = { total: 0, utilises: 0 };
      map[w.categorie].total++;
      if (w.estUtilise) map[w.categorie].utilises++;
    });

    return Object.entries(map)
      .map(([categorie, { total, utilises }]) => ({
        categorie,
        total,
        utilises,
        pourcentage: total > 0 ? Math.round((utilises / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  },

  /**
   * Génère un exemple de fichier CSV téléchargeable pour guider l'import.
   */
  downloadExampleCsv(): void {
    const example = [
      'mot,definition,exemple,nature,etymologie,prononciation,niveau,categorie',
      '"HESPER","Nom donné parfois à la planète Vénus","Hesper brillait dans le ciel orangé","Nom (M)","Grec hesperos, étoile du soir","è-spèr","3","CG (Culture Générale)"',
      '"EPHEMERE","Qui ne dure qu\'un jour, très court","Une gloire éphémère","Adjectif","Grec ephemeros, d\'un jour","é-fé-mèr","2","Vocabulaire"',
    ].join('\n');

    const blob = new Blob([example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exemple-epelle-moi.csv';
    link.click();
    URL.revokeObjectURL(url);
  },
};

export default csvService;
