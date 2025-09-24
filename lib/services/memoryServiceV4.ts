/**
 * MemoryServiceV4 - Service Mem0 complet pour pentesting
 * Utilise toutes les capacités Mem0 : custom categories, instructions, graph, criteria retrieval
 */

import { MemoryClient } from 'mem0ai';

// Configuration des compartiments pentesting
export interface CompartmentConfig {
  category: string;
  description: string;
  instructions: string;
  includes?: string;
  excludes?: string;
  retention?: number | null; // Jours de rétention (null = permanent)
  auto_actions?: string[];
  auto_link?: string[];
  required_fields?: Record<string, string>;
  output_template?: string;
}

// Configuration des critères de recherche
export interface SearchCriteria {
  priority?: 'exploits' | 'recon' | 'failures' | 'plans';
  recency?: boolean;
  success_rate?: number;
  category_match?: number;
}

// Type pour les résultats Mem0
export interface MemoryResult {
  id: string;
  memory: string;
  event: 'ADD' | 'UPDATE' | 'DELETE';
  metadata?: Record<string, any>;
  score?: number;
}

export class MemoryServiceV4 {
  private client: MemoryClient;
  private projectId: string;
  private userId: string;
  private compartments: Map<string, CompartmentConfig>;

  constructor(config: {
    apiKey: string;
    projectId: string;
    userId: string;
    orgId?: string;
  }) {
    // Initialiser le client Mem0
    this.client = new MemoryClient({
      apiKey: config.apiKey,
      organizationId: config.orgId,
      projectId: config.projectId
    });

    this.projectId = config.projectId;
    this.userId = `${config.projectId}-${config.userId}`; // Isolation par projet
    this.compartments = new Map();

    // Initialiser les compartiments
    this.setupCompartments();
  }

  /**
   * Configuration des compartiments pentesting
   */
  private setupCompartments() {
    // COMPARTIMENT SUCCESS
    this.compartments.set('success_exploits', {
      category: 'success_exploits',
      description: 'Exploits validés avec payload, conditions et contournements',
      instructions: `
        POUR success_exploits:
        - TOUJOURS extraire: payload exact, URL cible, headers requis, conditions de succès
        - CRÉER automatiquement: liens vers failed_attempts similaires
        - GÉNÉRER: 5 variations du payload pour tests futurs
        - ANALYSER: protection contournée et méthode utilisée
        - FORMAT: structured_exploit_template avec tous les détails
        - RETENTION: permanent (jamais supprimer les succès)
      `,
      includes: 'exploit, payload, bypass, success, vulnerability, working',
      excludes: 'passwords, personal_data, sensitive_keys',
      retention: null, // Garder pour toujours
      auto_actions: [
        'generate_variations',
        'link_failures',
        'extract_pattern',
        'create_graph_relations'
      ],
      required_fields: {
        payload: 'string',
        target_url: 'string',
        conditions: 'array',
        bypass_method: 'string'
      },
      output_template: '### Success: {title}\n**Payload**: {payload}\n**Target**: {target_url}\n**Bypass**: {bypass_method}'
    });

    // COMPARTIMENT FAILED
    this.compartments.set('failed_attempts', {
      category: 'failed_attempts',
      description: 'Tentatives échouées avec analyse et suggestions de contournement',
      instructions: `
        POUR failed_attempts:
        - ANALYSER: raison exacte de l'échec (WAF, CSP, filtrage)
        - IDENTIFIER: protection détectée et ses caractéristiques
        - SUGGÉRER: 3 méthodes de contournement possibles
        - LIER: succès similaires qui ont fonctionné
        - APPRENDRE: patterns à éviter à l'avenir
        - RETENTION: 30 jours sauf si marqué important
      `,
      includes: 'failed, blocked, filtered, error, denied, rejected',
      excludes: 'success, working, bypassed',
      retention: 30, // 30 jours
      auto_actions: [
        'analyze_protection',
        'suggest_bypasses',
        'link_successes',
        'learn_pattern'
      ],
      auto_link: ['success_exploits', 'patterns']
    });

    // COMPARTIMENT RECONNAISSANCE
    this.compartments.set('reconnaissance', {
      category: 'reconnaissance',
      description: 'Informations collectées: ports, services, technologies, CVEs',
      instructions: `
        POUR reconnaissance:
        - ORGANISER: par domaine/IP cible
        - EXTRAIRE: ports ouverts, services, versions, technologies
        - IDENTIFIER: CVEs potentiels et vulnérabilités connues
        - CRÉER: graphe de relations entre services
        - PRIORISER: cibles par criticité et accessibilité
        - RETENTION: 90 jours (les infos deviennent obsolètes)
      `,
      includes: 'scan, port, service, technology, version, CVE, vulnerability',
      excludes: 'exploit, payload',
      retention: 90, // 90 jours
      auto_actions: [
        'identify_vulnerabilities',
        'create_service_graph',
        'prioritize_targets'
      ]
    });

    // COMPARTIMENT PLANS
    this.compartments.set('active_plans', {
      category: 'active_plans',
      description: 'Plans d\'attaque, prochaines étapes, hypothèses à tester',
      instructions: `
        POUR active_plans:
        - STRUCTURER: objectif, étapes, ressources nécessaires
        - PRIORISER: par probabilité de succès et impact
        - TRACKER: progression et résultats de chaque étape
        - ADAPTER: plan selon les découvertes
        - DOCUMENTER: décisions et raisonnements
        - RETENTION: jusqu'à complétion ou abandon
      `,
      includes: 'plan, strategy, next, todo, hypothesis, approach',
      excludes: 'completed, done, finished',
      retention: null, // Jusqu'à marqué comme complété
      auto_actions: [
        'track_progress',
        'adapt_strategy',
        'link_discoveries'
      ]
    });

    // COMPARTIMENT PATTERNS
    this.compartments.set('patterns', {
      category: 'patterns',
      description: 'Techniques réutilisables extraites automatiquement des succès',
      instructions: `
        POUR patterns:
        - EXTRAIRE: techniques communes des succès multiples
        - GÉNÉRALISER: pour réutilisation sur différentes cibles
        - CATÉGORISER: par type de vulnérabilité
        - SCORER: taux de réussite et fiabilité
        - DOCUMENTER: contextes d'application
        - RETENTION: permanent (capital intellectuel)
      `,
      includes: 'pattern, technique, method, approach, template',
      excludes: 'specific, unique, one-time',
      retention: null, // Permanent
      auto_actions: [
        'generalize_technique',
        'calculate_success_rate',
        'categorize_vulnerability'
      ]
    });
  }

  /**
   * Initialiser le projet avec les catégories personnalisées
   */
  async initializeProject(): Promise<void> {
    try {
      // Note: Project-level configuration requires PRO plan
      // For FREE/STARTER plans, we'll use metadata to organize compartments
      console.log('✅ Compartments initialized using metadata organization');

      // Add a test memory to ensure connectivity
      await this.client.add([
        { role: 'user' as const, content: 'Initialize' },
        { role: 'assistant' as const, content: 'System initialized' }
      ], {
        user_id: this.userId,
        metadata: {
          type: 'system_init',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
    }
  }

  /**
   * Ajouter une mémoire dans un compartiment spécifique
   */
  async addToCompartment(
    compartmentName: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<MemoryResult[]> {
    const config = this.compartments.get(compartmentName);
    if (!config) {
      throw new Error(`Compartiment inconnu: ${compartmentName}`);
    }

    try {
      // Préparer les messages
      const messages = [
        { role: 'user' as const, content },
        { role: 'assistant' as const, content: `Stored in ${compartmentName}` }
      ];

      // Ajouter avec la configuration du compartiment
      const result = await this.client.add(messages, {
        user_id: this.userId,
        includes: config.includes,
        excludes: config.excludes,
        metadata: {
          compartment: compartmentName,
          timestamp: new Date().toISOString(),
          ...metadata
        },
        output_format: 'v1.1'
        // enable_graph: true // Disabled - requires PRO plan
      });

      // Auto-actions disabled for now - require PRO features
      // if (config.auto_actions && result.results) {
      //   for (const action of config.auto_actions) {
      //     await this.executeAutoAction(action, result.results[0]?.id, compartmentName);
      //   }
      // }

      return result.results || [];
    } catch (error) {
      console.error(`Erreur ajout dans ${compartmentName}:`, error);
      throw error;
    }
  }

  /**
   * Recherche dans un compartiment spécifique
   */
  async searchCompartment(
    compartmentName: string,
    query: string,
    options?: { limit?: number }
  ): Promise<any[]> {
    try {
      const results = await this.client.search(query || '*', {
        user_id: this.userId,
        filters: {
          metadata: {
            compartment: compartmentName
          }
        },
        limit: options?.limit || 10
      });

      return results || [];
    } catch (error) {
      console.error(`Erreur recherche dans ${compartmentName}:`, error);
      return [];
    }
  }

  /**
   * Recherche avec critères pentesting
   */
  async searchWithCriteria(
    query: string,
    criteria?: SearchCriteria
  ): Promise<MemoryResult[]> {
    try {
      const results = await this.client.search(query, {
        user_id: this.userId,
        output_format: 'v1.1',
        // Criteria retrieval si supporté
        ...(criteria && {
          filters: this.buildFilters(criteria)
        })
      });

      return results.results || [];
    } catch (error) {
      console.error('Erreur recherche:', error);
      return [];
    }
  }

  /**
   * Recherche par compartiment
   */
  async searchInCompartment(
    compartmentName: string,
    query: string
  ): Promise<MemoryResult[]> {
    const config = this.compartments.get(compartmentName);
    if (!config) {
      throw new Error(`Compartiment inconnu: ${compartmentName}`);
    }

    try {
      const results = await this.client.search(query, {
        user_id: this.userId,
        filters: {
          AND: [
            { metadata: { compartment: compartmentName } }
          ]
        },
        output_format: 'v1.1'
      });

      return results.results || [];
    } catch (error) {
      console.error(`Erreur recherche dans ${compartmentName}:`, error);
      return [];
    }
  }

  /**
   * Obtenir toutes les mémoires d'un compartiment
   */
  async getCompartmentMemories(compartmentName: string): Promise<MemoryResult[]> {
    try {
      const results = await this.client.getAll({
        user_id: this.userId,
        filters: {
          AND: [
            { metadata: { compartment: compartmentName } }
          ]
        },
        output_format: 'v1.1'
      });

      return results.memories || [];
    } catch (error) {
      console.error(`Erreur récupération ${compartmentName}:`, error);
      return [];
    }
  }

  /**
   * Mettre à jour une mémoire
   */
  async updateMemory(
    memoryId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.client.update(memoryId, {
        text: content,
        metadata
      });
    } catch (error) {
      console.error('Erreur mise à jour mémoire:', error);
    }
  }

  /**
   * Supprimer une mémoire
   */
  async deleteMemory(memoryId: string): Promise<void> {
    try {
      await this.client.delete(memoryId);
    } catch (error) {
      console.error('Erreur suppression mémoire:', error);
    }
  }

  /**
   * Obtenir les relations graphe d'une mémoire
   */
  async getMemoryRelations(memoryId: string): Promise<any> {
    try {
      // Utiliser get_all avec le graph activé
      const memory = await this.client.get(memoryId);
      return memory;
    } catch (error) {
      console.error('Erreur récupération relations:', error);
      return null;
    }
  }

  /**
   * Exécuter une action automatique
   */
  private async executeAutoAction(
    action: string,
    memoryId: string,
    compartmentName: string
  ): Promise<void> {
    switch (action) {
      case 'generate_variations':
        await this.generatePayloadVariations(memoryId);
        break;
      case 'link_failures':
        await this.linkToFailures(memoryId);
        break;
      case 'extract_pattern':
        await this.extractPattern(memoryId);
        break;
      case 'analyze_protection':
        await this.analyzeProtection(memoryId);
        break;
      case 'suggest_bypasses':
        await this.suggestBypasses(memoryId);
        break;
      case 'create_graph_relations':
        // Le graph est automatique avec enable_graph
        break;
    }
  }

  /**
   * Générer des variations de payload
   */
  private async generatePayloadVariations(memoryId: string): Promise<void> {
    // Implémentation des variations
    console.log(`Génération variations pour ${memoryId}`);
  }

  /**
   * Lier aux échecs similaires
   */
  private async linkToFailures(memoryId: string): Promise<void> {
    // Rechercher les échecs similaires
    const memory = await this.client.get(memoryId);
    if (memory) {
      const failures = await this.searchInCompartment('failed_attempts', memory.memory);
      console.log(`Trouvé ${failures.length} échecs liés`);
    }
  }

  /**
   * Extraire un pattern réutilisable
   */
  private async extractPattern(memoryId: string): Promise<void> {
    const memory = await this.client.get(memoryId);
    if (memory) {
      // Ajouter au compartiment patterns
      await this.addToCompartment('patterns', `Pattern extrait de: ${memory.memory}`, {
        source_memory: memoryId
      });
    }
  }

  /**
   * Analyser la protection détectée
   */
  private async analyzeProtection(memoryId: string): Promise<void> {
    console.log(`Analyse protection pour ${memoryId}`);
  }

  /**
   * Suggérer des contournements
   */
  private async suggestBypasses(memoryId: string): Promise<void> {
    console.log(`Suggestions bypass pour ${memoryId}`);
  }

  /**
   * Construire les filtres pour criteria retrieval
   */
  private buildFilters(criteria: SearchCriteria): any {
    const filters: any = { AND: [] };

    if (criteria.priority) {
      filters.AND.push({
        metadata: { compartment: `${criteria.priority}` }
      });
    }

    if (criteria.success_rate) {
      filters.AND.push({
        metadata: { success_rate: { gte: criteria.success_rate } }
      });
    }

    return filters;
  }

  /**
   * Nettoyer les mémoires expirées
   */
  async cleanupExpiredMemories(): Promise<void> {
    for (const [name, config] of this.compartments.entries()) {
      if (config.retention) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.retention);

        const memories = await this.getCompartmentMemories(name);
        for (const memory of memories) {
          if (memory.metadata?.timestamp) {
            const memoryDate = new Date(memory.metadata.timestamp);
            if (memoryDate < cutoffDate) {
              await this.deleteMemory(memory.id);
              console.log(`Supprimé mémoire expirée: ${memory.id}`);
            }
          }
        }
      }
    }
  }

  /**
   * Obtenir les statistiques des compartiments
   */
  async getCompartmentStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const name of this.compartments.keys()) {
      const memories = await this.getCompartmentMemories(name);
      stats[name] = memories.length;
    }

    return stats;
  }
}