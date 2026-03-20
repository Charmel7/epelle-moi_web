# Épelle-Moi — Web Edition

Application web React de gestion de concours d'orthographe (Spelling Bee), fidèle au design original Flutter avec des améliorations cinématographiques.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | React 18 + TypeScript + Vite |
| Style | Tailwind CSS v3 |
| État global | Zustand + devtools |
| Backend & Realtime | Supabase (PostgreSQL + WebSockets) |
| Routing | React Router v6 |
| Analytics | Recharts |
| Animations | CSS Keyframes custom |
| Identifiants | uuid v4 |

---

## Structure du projet

```
src/
├── types/
│   └── index.ts              # Modèles : Word, Candidate, Phase, CompetitionState
│
├── services/
│   ├── csvService.ts         # Parse CSV → Word[], export, stats catégories
│   └── supabaseService.ts    # TOUS les appels Supabase (words, candidates, competition, realtime)
│
├── store/
│   └── useCompetitionStore.ts # Zustand store — logique métier centralisée + sélecteurs
│
├── hooks/
│   └── index.ts              # useChrono, useRealtime, useKeyboard, useLetterStatus, useSound
│
├── components/
│   ├── shared/
│   │   └── LetterTile.tsx    # Tuile lettre réutilisable (admin + public)
│   ├── admin/
│   │   ├── AdminView.tsx     # Interface jury complète
│   │   ├── CsvImporter.tsx   # Import CSV drag & drop
│   │   └── DashboardView.tsx # Analytics post-compétition
│   └── public/
│       └── PublicView.tsx    # Écran de projection Realtime
│
├── styles/
│   └── animations.css        # letterFlipIn, shake, pulseOnce
│
└── App.tsx                   # Routing : /admin /public /dashboard
```

---

## Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

Créer un projet sur [supabase.com](https://supabase.com), puis créer le fichier `.env` :

```env
VITE_SUPABASE_URL=https://VOTRE_ID.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_publique
```

### 3. Créer les tables Supabase

Exécuter ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Table des mots
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mot TEXT UNIQUE NOT NULL,
  definition TEXT NOT NULL,
  exemple TEXT DEFAULT '',
  nature TEXT DEFAULT '',
  etymologie TEXT DEFAULT '',
  prononciation TEXT DEFAULT '',
  niveau INTEGER DEFAULT 3 CHECK (niveau BETWEEN 1 AND 5),
  categorie TEXT DEFAULT 'Non classé',
  "estUtilise" BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des candidats
CREATE TABLE candidates (
  id UUID PRIMARY KEY,
  nom TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  "estQualifie" BOOLEAN DEFAULT false,
  "tempsRestant" INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table d'état de la compétition (1 seule ligne)
CREATE TABLE competition (
  id TEXT PRIMARY KEY DEFAULT 'current',
  phase TEXT DEFAULT 'qualifications',
  status TEXT DEFAULT 'en_attente',
  "candidatActifId" TEXT,
  "motActuel" JSONB,
  "lettresSaisies" TEXT DEFAULT '',
  "chronoActif" BOOLEAN DEFAULT false,
  "tempsRestant" INTEGER DEFAULT 60,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer la ligne d'état initial
INSERT INTO competition (id) VALUES ('current') ON CONFLICT DO NOTHING;

-- Activer le Realtime sur la table competition
ALTER TABLE competition REPLICA IDENTITY FULL;
ALTER TABLE candidates REPLICA IDENTITY FULL;
```

### 4. Activer le Realtime dans Supabase

Dans Supabase Dashboard → Database → Replication :
- Activer `competition` et `candidates` dans la liste des tables Realtime.

### 5. Lancer l'application

```bash
npm run dev
```

---

## Utilisation

### Démarrer un concours

1. Ouvrir `/admin` dans l'onglet de contrôle
2. Ouvrir `/public` en plein écran sur le projecteur (F11)
3. Importer le fichier CSV des mots (bouton "CHARGER LE FICHIER CSV")
4. Ajouter les candidats dans la section "GESTION DES CANDIDATS"
5. Sélectionner la phase (Qualifications → Finale)
6. Cliquer sur un candidat pour l'activer
7. Cliquer "MOT SUIVANT" pour tirer un mot
8. L'admin saisit les lettres → elles apparaissent en direct sur le projecteur
9. Valider CORRECT ou INCORRECT

### Format du fichier CSV

Les colonnes attendues (séparateur virgule ou point-virgule) :

```
mot,definition,exemple,nature,etymologie,prononciation,niveau,categorie
```

- `mot` et `definition` sont **obligatoires**
- `niveau` : entier de 1 à 5 (défaut: 3)
- Télécharger un exemple via le bouton "EXEMPLE" dans l'interface

### Raccourcis clavier (vue Admin)

| Touche | Action |
|--------|--------|
| A–Z | Ajouter une lettre |
| Backspace | Effacer la dernière lettre |
| Escape | Effacer tout |
| Enter | Valider comme CORRECT |

---

## Architecture des données

### Flux de données

```
CSV local
    │
    ▼ csvService.parseFile()
Word[] parsé
    │
    ▼ supabaseService.words.upsertMany()
Table Supabase `words`
    │
    ▼ store.tirerMotSuivant()
competition.motActuel mis à jour
    │
    ▼ Supabase Realtime (WebSocket)
Vue publique /public reçoit le mot en <100ms
```

### Règle de non-répétition des mots

À chaque tirage, `supabaseService.words.markAsUsed(id)` est appelé **immédiatement**,
avant même la validation. Même si l'application se ferme et redémarre, le mot ne peut
plus être tiré car `estUtilise = true` en base.

---

## Déploiement

```bash
npm run build
# Déployer le dossier dist/ sur Vercel, Netlify ou tout hébergeur statique
```

Les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) doivent
être configurées dans le dashboard de l'hébergeur.
