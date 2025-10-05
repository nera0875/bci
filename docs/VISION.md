# 🎯 VISION - DASH1 Knowledge Management System v2.0

**Dernière MAJ:** 2025-10-03

---

## 🧠 Vision Globale

Système universel d'apprentissage et d'organisation automatique avec IA prédictive, adaptable à tout domaine (pentesting, dev, trading, recherche).

**Objectif:** Un second cerveau qui n'oublie jamais rien, apprend de chaque action, prédit avec précision croissante, et s'adapte à tout domaine.

---

## 📊 Architecture du Système

```
Utilisateur (Yeux + Mains) ↔ IA (Cerveau + Mémoire) ↔ Learning (Evolution)
```

### Workflow Complet

```
1. User envoie message
   ↓
2. Claude stream réponse (avec contexte projet + memory + rules actives)
   ↓
3. AI Action Detector analyse → Détecte intentions (créer doc, ranger, etc.)
   ↓
4. Toast interactif apparaît → ✅ Accept | ❌ Reject | ✏️ Modify
   ↓
5. Si Accept → INSERT dans suggestions_queue (status=pending)
   ↓
6. User valide dans Intelligence > Suggestions
   ↓
7. executeSuggestion() → INSERT memory_nodes OU rules OU learned_patterns
   ↓
8. INSERT user_decisions (track decision_type + proposed_action + user_choice)
   ↓
9. Pattern Learner analyse user_decisions (clustering + confidence)
   ↓
10. Si pattern détecté (confidence > 80%) → INSERT learned_patterns
   ↓
11. User crée rule depuis pattern (bouton "Create Rule" si success_rate > 70%)
   ↓
12. Rule auto-appliquée sur prochaines suggestions → Auto-reinforcement ♾️
```

---

## 🗄️ Architecture Base de Données (SCHÉMAS RÉELS)

### Tables Principales

#### 1. `memory_nodes` - Arbre hiérarchique mémoire
```sql
CREATE TABLE memory_nodes (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  name text NOT NULL,
  content text,
  type text CHECK (type IN ('folder', 'document')),
  parent_id uuid REFERENCES memory_nodes(id),
  icon text DEFAULT '📄',
  color text DEFAULT 'blue',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### 2. `rules` - Playbooks JSON personnalisables
```sql
CREATE TABLE rules (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  name text NOT NULL,
  trigger text NOT NULL,
  action text NOT NULL,
  enabled boolean DEFAULT false,
  category text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### 3. `attack_patterns` - Success rate techniques
```sql
CREATE TABLE attack_patterns (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  pattern_type text NOT NULL,
  pattern jsonb NOT NULL,
  context text,
  technique text,
  usage_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  success_rate real GENERATED ALWAYS AS (
    CASE WHEN usage_count > 0
    THEN success_count::real / usage_count::real
    ELSE 0 END
  ) STORED,
  last_success_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### 4. `learned_patterns` - Patterns détectés automatiquement
```sql
CREATE TABLE learned_patterns (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  pattern_type text,
  pattern_data jsonb NOT NULL,
  confidence real CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count integer DEFAULT 1,
  context text,
  created_at timestamptz DEFAULT now()
);
```

#### 5. `suggestions_queue` - Queue suggestions IA
```sql
CREATE TABLE suggestions_queue (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  type text CHECK (type IN ('storage', 'rule', 'improvement', 'pattern')),
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  suggestion jsonb NOT NULL,
  confidence real CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now()
);
```

#### 6. `user_decisions` - Track Accept/Reject pour learning (SCHÉMA RÉEL)
```sql
CREATE TABLE user_decisions (
  id uuid PRIMARY KEY,
  user_id uuid,
  project_id uuid REFERENCES projects(id),
  decision_type text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}',
  proposed_action jsonb NOT NULL,        -- ⚠️ REQUIS
  user_choice text NOT NULL CHECK (user_choice IN ('accept', 'reject', 'modify')), -- ⚠️ REQUIS
  user_modification jsonb,
  confidence_score real CHECK (confidence_score >= 0 AND confidence_score <= 1),
  execution_time_ms integer,
  embedding vector(1536),
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ⚠️ PAS de colonne 'suggestion_id' (contrairement à doc obsolète AUTO_REINFORCEMENT_ARCHITECTURE.md)
```

#### 7. `message_cache` - Cache réponses avec embeddings
```sql
CREATE TABLE message_cache (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  message_hash text UNIQUE NOT NULL,
  embedding vector(1536),
  cached_response text NOT NULL,
  metadata jsonb DEFAULT '{}',
  hit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

---

## 💡 Fonctionnalités Principales

### 1. System Prompt Configurable
- Chaque projet a son propre prompt de base modifiable
- Templates illimités depuis Settings (localStorage)
- QuickContextBar au-dessus de l'input chat (badge affichant template actif)
- L'IA adapte automatiquement son comportement selon le prompt

### 2. Memory Auto-Organisée
- L'IA range automatiquement les données dans une structure arborescente
- Organisation intelligente selon le contexte (vulns, bugs, patterns)
- Drag & drop pour réorganiser manuellement si besoin
- Édition inline (nom + contenu)

### 3. Learning & Predictions
- L'IA détecte les patterns récurrents depuis user_decisions
- Prédit les vulnérabilités/bugs avec des pourcentages de probabilité
- S'améliore à chaque validation (exponentielle)
- Clustering + confidence score > 80% → learned_patterns créé

### 4. Rules Focus ON/OFF
- Switches simples pour activer/désactiver des catégories
- L'IA se concentre sur les rules activées
- Éditable et personnalisable par projet
- Catégories: Authentication, API, Business Logic, Vulnerabilities

---

## 🤖 Comment Fonctionne l'AI Actions System

### Détection Automatique (AIActionDetector)

Quand l'IA stream sa réponse, le système analyse le texte pour détecter:

**📄 Créer un document**
- Patterns: "Je vais créer un document 'SQL Injection Success'"
- Extraction: Nom + Contenu + Icône (deviné automatiquement)

**📁 Créer un dossier**
- Patterns: "Je vais créer un dossier 'Success Cases'"
- Extraction: Nom + Icône

**✏️ Éditer un document existant**
- Patterns: "Je vais mettre à jour le document 'Results'"
- Extraction: Nom du document + Nouveau contenu (appendé)

**🗂️ Organiser / Déplacer**
- Patterns: "Je vais ranger ça dans Success"
- Extraction: Nom de l'item + Dossier cible

### Toast de Validation Interactive

Quand une action est détectée:
- Type d'action + Nom + Aperçu (80 chars)
- Score de confiance (85%)
- 2 boutons: ✅ Exécuter | ❌ Ignorer

### Exécution Réelle sur Supabase

Si ✅ cliqué:
- Créer document → `INSERT INTO memory_nodes`
- Créer dossier → `INSERT INTO memory_nodes (type='folder')`
- Éditer document → `UPDATE memory_nodes SET content = content || new_content`
- Organiser → `UPDATE memory_nodes SET parent_id = folder_id`

### Icônes Automatiques

| Mot-clé | Icône |
|---------|-------|
| success | ✅ |
| fail    | ❌ |
| sql     | 🗄️ |
| xss     | 🔥 |
| auth    | 🔐 |
| api     | 🔌 |
| test    | 🧪 |
| report  | 📊 |
| default | 📄 |

---

## 🛠️ Stack Technique

### Framework & Core
- **Next.js 15.5** - Framework React de production (App Router)
- **React 19.1.1** - Bibliothèque UI avec Server Components
- **TypeScript 5.9.2** - Typage statique strict

### Backend & Database
- **Supabase** - PostgreSQL + Auth + Realtime + Storage
- **pgvector** - Embeddings vectoriels pour similarity search
- **OpenAI API** - Embeddings (text-embedding-3-small)
- **Anthropic Claude 3.5 Sonnet** - Chat streaming

### UI & Styling
- **Tailwind CSS 4.1.13** - Framework CSS utilitaire
- **shadcn/ui** - Composants modernes (Radix UI + Tailwind)
- **Radix UI 1.1.0** - Primitives UI accessibles
- **Lucide React 0.445.0** - Icônes vectorielles
- **Framer Motion 11.5.6** - Animations fluides

### Forms & Validation
- **React Hook Form 7.53.0** - Gestion des formulaires
- **Zod** - Validation schémas

### Thème Design
- **Fond:** Blanc (#FFFFFF)
- **Texte principal:** Noir/Gris anthracite (#202123)
- **Arrière-plans:** Gris clair (#F7F7F8)
- **Texte secondaire:** Gris moyen (#6E6E80)
- **Design:** Minimaliste monochrome (noir/blanc)

---

## 🎯 Métriques de Succès

- 90% de prédiction correcte après 50+ sites
- 50% de temps gagné sur reconnaissance
- Organisation parfaite sans effort manuel
- ROI positif dès le premier mois

---

## 🚀 Workflow Métier (Exemples)

### Pour Pentesting
1. Coller requête HTTP Burp
2. IA analyse et prédit vulns probables (IDOR 85%, SQLi 40%)
3. Range dans Memory (/Endpoints/api/users/{id})
4. Apprend du résultat pour améliorer prédictions

### Pour Dev/Debug
1. Coller erreur ou code
2. IA analyse et suggère solutions
3. Range dans Memory (/Bugs/React/NullPointer)
4. Patterns détectés pour éviter futures erreurs

### Pour Trading
1. Input signaux/data
2. IA analyse patterns marché
3. Range dans Memory (/Strategies/RSI_Oversold)
4. Backtesting automatique

---

**🎯 Cette vision NE CHANGE JAMAIS sauf refonte architecture totale.**
