/**
 * Configuration Mem0 avec LLM natif et custom prompts
 *
 * Cette config permet à Mem0 de :
 * 1. Se connecter directement à Claude/GPT
 * 2. Extraire automatiquement les entités personnalisées
 * 3. Organiser les mémoires avec nos règles custom
 */

import { MemoryClient } from 'mem0ai'

// Configuration pour extraction d'entités personnalisée
const CUSTOM_EXTRACTION_PROMPT = `
Tu es un assistant spécialisé dans l'extraction et l'organisation de mémoires.
Extrais les informations suivantes de la conversation :

1. INFORMATIONS PERSONNELLES :
   - Taille, poids, âge
   - Préférences (langages, outils, etc.)
   - Habitudes et routines

2. PROJETS ET CONTEXTE :
   - Projets en cours
   - Technologies utilisées
   - Objectifs et deadlines

3. ORGANISATION :
   - Si l'utilisateur mentionne des dossiers ou documents, extrais :
     * Le chemin complet (ex: /Personnel/infos.md)
     * Le type (folder/document)
     * Le contenu à stocker

4. ACTIONS MÉMOIRE :
   - CREATE : Créer un nouveau nœud
   - UPDATE : Modifier un existant
   - DELETE : Supprimer
   - MOVE : Déplacer/réorganiser

Retourne les faits extraits au format JSON structuré.
Pour chaque fait, indique aussi s'il doit remplacer une info existante ou s'ajouter.

Exemples :
- "Ma taille est 190cm" → {"personal": {"height": "190cm"}, "action": "update"}
- "Crée un dossier Personnel" → {"folder": "/Personnel", "action": "create", "type": "folder"}
- "Ajoute ma taille dans infos.md" → {"document": "/infos.md", "content": {"height": "190cm"}, "action": "update"}
`

// Configuration avec provider LLM natif
export const MEM0_CONFIG = {
  // Provider LLM principal (Anthropic pour Claude)
  llm: {
    provider: 'anthropic',
    config: {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      max_tokens: 2000,
      api_key: process.env.ANTHROPIC_API_KEY
    }
  },

  // Embedder pour la recherche vectorielle
  embedder: {
    provider: 'openai',
    config: {
      model: 'text-embedding-3-small',
      api_key: process.env.OPENAI_API_KEY
    }
  },

  // Custom prompts pour extraction
  custom_prompts: {
    fact_extraction_prompt: CUSTOM_EXTRACTION_PROMPT,
    update_memory_prompt: `
      Quand tu mets à jour une mémoire existante :
      1. Conserve les infos importantes non mentionnées
      2. Remplace seulement ce qui est explicitement modifié
      3. Fusionne intelligemment les nouvelles infos
      4. Supprime les infos contradictoires obsolètes
    `
  },

  // Configuration de la mémoire
  memory: {
    // Auto-déduplication
    auto_dedupe: true,

    // Consolidation automatique
    auto_consolidate: true,
    consolidate_after_n_memories: 10,

    // Règles de rétention
    retention_policy: {
      default_ttl_days: 90, // 90 jours par défaut
      categories: {
        'personal': null, // Jamais supprimer les infos personnelles
        'temporary': 7,    // 7 jours pour le temporaire
        'project': 180    // 6 mois pour les projets
      }
    },

    // Catégories prédéfinies
    default_categories: [
      'personal',
      'projects',
      'preferences',
      'technical',
      'documents',
      'folders'
    ]
  },

  // Configuration de recherche
  search: {
    // Recherche hybride (vectorielle + mot-clé)
    hybrid_search: true,

    // Seuil de similarité
    similarity_threshold: 0.7,

    // Reranking pour améliorer la pertinence
    enable_reranking: true,

    // Nombre max de résultats
    default_limit: 10
  },

  // Graph de connaissances
  graph: {
    // Activer les relations entre entités
    enable_relationships: true,

    // Types de relations
    relationship_types: [
      'belongs_to',    // Document appartient à dossier
      'references',    // Document référence un autre
      'related_to',    // Lien sémantique
      'parent_of'      // Hiérarchie dossiers
    ]
  }
}

/**
 * Initialiser Mem0 avec configuration complète
 */
export async function initializeMem0WithConfig(projectId: string) {
  const apiKey = process.env.MEM0_API_KEY

  if (!apiKey) {
    throw new Error('MEM0_API_KEY required')
  }

  // Créer client avec config étendue
  const client = new MemoryClient({
    api_key: apiKey,
    ...MEM0_CONFIG
  })

  console.log('✅ Mem0 initialisé avec :')
  console.log('  - LLM natif : Anthropic Claude')
  console.log('  - Custom prompts : Activés')
  console.log('  - Auto-consolidation : Activée')
  console.log('  - Graph de connaissances : Activé')
  console.log('  - Règles de rétention : Configurées')

  return client
}

/**
 * Helper pour créer une structure dossier/document
 * tout en utilisant les catégories Mem0
 */
export function mapFolderToCategories(path: string): string[] {
  // Convertir /Personnel/Projets/BCI en catégories
  const parts = path.split('/').filter(p => p)
  const categories = ['folders']

  // Ajouter chaque niveau comme catégorie
  parts.forEach((part, index) => {
    categories.push(`folder:${parts.slice(0, index + 1).join('/')}`)
  })

  return categories
}

/**
 * Helper pour extraire les métadonnées d'organisation
 */
export function extractOrganizationMetadata(path: string, type: 'folder' | 'document') {
  const parts = path.split('/').filter(p => p)
  const name = parts[parts.length - 1] || 'root'
  const parent = '/' + parts.slice(0, -1).join('/')

  return {
    node_type: type,
    node_name: name,
    node_path: path,
    parent_path: parent,
    depth: parts.length,
    categories: mapFolderToCategories(parent)
  }
}