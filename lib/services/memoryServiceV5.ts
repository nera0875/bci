/**
 * MemoryServiceV5 - Service Mem0 complet avec toutes les features STARTER ($19/mois)
 * Utilise : Custom Categories, Tags, Metadata, Subcategories, Custom Fields
 */

export interface MemoryConfig {
  apiKey: string;
  projectId?: string;
  userId?: string;
  orgId?: string;
  baseUrl?: string;
  plan?: 'FREE' | 'STARTER' | 'PRO';
}

// Structure complète d'organisation
export interface MemoryCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories?: Subcategory[];
  defaultTags?: string[];
  customFields?: CustomField[];
  priority?: number;
}

export interface Subcategory {
  id: string;
  name: string;
  parentId: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  defaultValue?: any;
}

export interface MemoryMetadata {
  // Organisation principale
  category: string;
  subcategory?: string;

  // Tags système
  tags?: string[];

  // Priorité et sévérité
  priority?: 'low' | 'medium' | 'high' | 'critical';
  severity?: 1 | 2 | 3 | 4 | 5;
  confidence?: number; // 0-100

  // Tracking
  timestamp?: string;
  expiresAt?: string;
  source?: string;
  author?: string;

  // Relations
  relatedMemories?: string[];
  parentMemory?: string;
  childMemories?: string[];

  // Custom fields pentesting
  exploit?: {
    type: string;
    payload: string;
    target: string;
    success: boolean;
    bypass?: string[];
  };

  vulnerability?: {
    cve?: string[];
    cvss?: number;
    affected_component?: string;
    patch_available?: boolean;
  };

  reconnaissance?: {
    port?: number;
    service?: string;
    version?: string;
    technology?: string[];
  };

  // Champs libres
  customData?: Record<string, any>;
}

// Les 15 catégories par défaut de Mem0
const MEM0_DEFAULT_CATEGORIES = [
  'personal_details',
  'family',
  'professional_details',
  'sports',
  'travel',
  'food',
  'music',
  'health',
  'technology',
  'hobbies',
  'fashion',
  'entertainment',
  'milestones',
  'user_preferences',
  'misc'
];

// Nos catégories custom pour pentesting
const PENTEST_CATEGORIES: MemoryCategory[] = [
  {
    id: 'reconnaissance',
    name: '🔍 Reconnaissance',
    icon: 'Search',
    color: 'text-blue-500',
    description: 'Information gathering and discovery',
    subcategories: [
      { id: 'network_scan', name: 'Network Scanning', parentId: 'reconnaissance', icon: 'Wifi', color: 'text-blue-400', tags: ['nmap', 'masscan'] },
      { id: 'osint', name: 'OSINT', parentId: 'reconnaissance', icon: 'Globe', color: 'text-cyan-500', tags: ['google', 'shodan'] },
      { id: 'subdomain_enum', name: 'Subdomain Enumeration', parentId: 'reconnaissance', icon: 'Network', color: 'text-blue-600', tags: ['dns', 'subdomains'] },
      { id: 'tech_stack', name: 'Technology Stack', parentId: 'reconnaissance', icon: 'Layers', color: 'text-indigo-500', tags: ['wappalyzer', 'builtwith'] }
    ],
    defaultTags: ['recon', 'discovery', 'information'],
    customFields: [
      { name: 'target', type: 'text', required: true },
      { name: 'ports', type: 'array' },
      { name: 'technologies', type: 'array' }
    ]
  },
  {
    id: 'vulnerabilities',
    name: '⚠️ Vulnerabilities',
    icon: 'AlertTriangle',
    color: 'text-orange-500',
    description: 'Identified security vulnerabilities',
    subcategories: [
      { id: 'critical', name: 'Critical', parentId: 'vulnerabilities', icon: 'AlertCircle', color: 'text-red-600', tags: ['critical', 'p1'] },
      { id: 'high', name: 'High', parentId: 'vulnerabilities', icon: 'Alert', color: 'text-red-500', tags: ['high', 'p2'] },
      { id: 'medium', name: 'Medium', parentId: 'vulnerabilities', icon: 'Info', color: 'text-orange-500', tags: ['medium', 'p3'] },
      { id: 'low', name: 'Low', parentId: 'vulnerabilities', icon: 'HelpCircle', color: 'text-yellow-500', tags: ['low', 'p4'] }
    ],
    defaultTags: ['vuln', 'security', 'risk'],
    customFields: [
      { name: 'cve', type: 'array' },
      { name: 'cvss', type: 'number' },
      { name: 'patch_available', type: 'boolean' }
    ]
  },
  {
    id: 'exploits',
    name: '💉 Exploits',
    icon: 'Zap',
    color: 'text-green-500',
    description: 'Successful exploitation techniques',
    subcategories: [
      { id: 'sqli', name: 'SQL Injection', parentId: 'exploits', icon: 'Database', color: 'text-red-500', tags: ['sqli', 'database'] },
      { id: 'xss', name: 'XSS', parentId: 'exploits', icon: 'Code', color: 'text-yellow-500', tags: ['xss', 'javascript'] },
      { id: 'rce', name: 'RCE', parentId: 'exploits', icon: 'Terminal', color: 'text-purple-500', tags: ['rce', 'shell'] },
      { id: 'lfi', name: 'LFI/RFI', parentId: 'exploits', icon: 'FileText', color: 'text-orange-500', tags: ['lfi', 'rfi'] },
      { id: 'xxe', name: 'XXE', parentId: 'exploits', icon: 'FileCode', color: 'text-pink-500', tags: ['xxe', 'xml'] },
      { id: 'ssrf', name: 'SSRF', parentId: 'exploits', icon: 'Link', color: 'text-blue-500', tags: ['ssrf', 'request'] }
    ],
    defaultTags: ['exploit', 'payload', 'poc'],
    customFields: [
      { name: 'payload', type: 'text', required: true },
      { name: 'target_url', type: 'text', required: true },
      { name: 'success', type: 'boolean', defaultValue: false }
    ]
  },
  {
    id: 'failed_attempts',
    name: '❌ Failed Attempts',
    icon: 'XCircle',
    color: 'text-red-500',
    description: 'Failed exploitation attempts for learning',
    subcategories: [
      { id: 'waf_blocked', name: 'WAF Blocked', parentId: 'failed_attempts', icon: 'Shield', color: 'text-red-400', tags: ['waf', 'blocked'] },
      { id: 'auth_required', name: 'Auth Required', parentId: 'failed_attempts', icon: 'Lock', color: 'text-gray-500', tags: ['auth', '401'] },
      { id: 'rate_limited', name: 'Rate Limited', parentId: 'failed_attempts', icon: 'Clock', color: 'text-orange-400', tags: ['429', 'ratelimit'] },
      { id: 'input_filtered', name: 'Input Filtered', parentId: 'failed_attempts', icon: 'Filter', color: 'text-yellow-400', tags: ['filter', 'sanitized'] }
    ],
    defaultTags: ['failed', 'blocked', 'learn'],
    customFields: [
      { name: 'reason', type: 'text', required: true },
      { name: 'protection_detected', type: 'text' },
      { name: 'bypass_suggestions', type: 'array' }
    ]
  },
  {
    id: 'strategies',
    name: '🎯 Strategies',
    icon: 'Target',
    color: 'text-purple-500',
    description: 'Attack strategies and methodologies',
    subcategories: [
      { id: 'active_plans', name: 'Active Plans', parentId: 'strategies', icon: 'PlayCircle', color: 'text-green-500', tags: ['active', 'current'] },
      { id: 'completed', name: 'Completed', parentId: 'strategies', icon: 'CheckCircle', color: 'text-gray-500', tags: ['done', 'completed'] },
      { id: 'hypotheses', name: 'Hypotheses', parentId: 'strategies', icon: 'Lightbulb', color: 'text-yellow-500', tags: ['idea', 'hypothesis'] }
    ],
    defaultTags: ['strategy', 'plan', 'approach'],
    customFields: [
      { name: 'objective', type: 'text', required: true },
      { name: 'steps', type: 'array' },
      { name: 'status', type: 'text', defaultValue: 'planning' }
    ]
  },
  {
    id: 'patterns',
    name: '🔄 Patterns',
    icon: 'GitBranch',
    color: 'text-indigo-500',
    description: 'Reusable attack patterns and techniques',
    subcategories: [
      { id: 'bypass_techniques', name: 'Bypass Techniques', parentId: 'patterns', icon: 'Unlock', color: 'text-green-500', tags: ['bypass', 'evasion'] },
      { id: 'payloads', name: 'Payload Templates', parentId: 'patterns', icon: 'Package', color: 'text-blue-500', tags: ['payload', 'template'] },
      { id: 'workflows', name: 'Attack Workflows', parentId: 'patterns', icon: 'GitMerge', color: 'text-purple-500', tags: ['workflow', 'chain'] }
    ],
    defaultTags: ['pattern', 'reusable', 'technique'],
    customFields: [
      { name: 'pattern_type', type: 'text' },
      { name: 'success_rate', type: 'number' },
      { name: 'contexts', type: 'array' }
    ]
  },
  {
    id: 'credentials',
    name: '🔑 Credentials',
    icon: 'Key',
    color: 'text-yellow-500',
    description: 'Discovered credentials and access tokens',
    subcategories: [
      { id: 'valid', name: 'Valid', parentId: 'credentials', icon: 'CheckCircle', color: 'text-green-500', tags: ['valid', 'working'] },
      { id: 'expired', name: 'Expired', parentId: 'credentials', icon: 'XCircle', color: 'text-red-500', tags: ['expired', 'invalid'] },
      { id: 'api_keys', name: 'API Keys', parentId: 'credentials', icon: 'Key', color: 'text-blue-500', tags: ['api', 'token'] }
    ],
    defaultTags: ['creds', 'auth', 'access'],
    customFields: [
      { name: 'type', type: 'text', required: true },
      { name: 'scope', type: 'array' },
      { name: 'valid_until', type: 'text' }
    ]
  },
  {
    id: 'tools',
    name: '🛠️ Tools & Scripts',
    icon: 'Wrench',
    color: 'text-gray-600',
    description: 'Custom tools and automation scripts',
    subcategories: [
      { id: 'scanners', name: 'Scanners', parentId: 'tools', icon: 'Search', color: 'text-blue-500', tags: ['scanner', 'automation'] },
      { id: 'exploits_tools', name: 'Exploit Tools', parentId: 'tools', icon: 'Zap', color: 'text-red-500', tags: ['exploit', 'tool'] },
      { id: 'helpers', name: 'Helper Scripts', parentId: 'tools', icon: 'Code', color: 'text-green-500', tags: ['helper', 'utility'] }
    ],
    defaultTags: ['tool', 'script', 'automation'],
    customFields: [
      { name: 'language', type: 'text' },
      { name: 'dependencies', type: 'array' },
      { name: 'usage', type: 'text' }
    ]
  }
];

export class MemoryServiceV5 {
  private config: MemoryConfig;
  private categories: Map<string, MemoryCategory> = new Map();
  private headers: HeadersInit;

  constructor(config: MemoryConfig) {
    this.config = {
      baseUrl: 'https://api.mem0.ai/v1',
      plan: 'STARTER',
      ...config
    };

    this.headers = {
      'Authorization': `Token ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };

    // Initialiser les catégories
    this.initializeCategories();
  }

  private initializeCategories() {
    // Ajouter toutes les catégories pentesting
    PENTEST_CATEGORIES.forEach(cat => {
      this.categories.set(cat.id, cat);
    });
  }

  // Obtenir toutes les catégories
  getCategories(): MemoryCategory[] {
    return Array.from(this.categories.values());
  }

  // Obtenir une catégorie spécifique
  getCategory(categoryId: string): MemoryCategory | undefined {
    return this.categories.get(categoryId);
  }

  // Obtenir les sous-catégories d'une catégorie
  getSubcategories(categoryId: string): Subcategory[] {
    const category = this.categories.get(categoryId);
    return category?.subcategories || [];
  }

  // Ajouter une mémoire avec metadata complètes
  async addMemory(
    content: string,
    metadata: MemoryMetadata
  ): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/memories/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messages: [
            { role: 'user', content },
            { role: 'assistant', content: 'Stored successfully' }
          ],
          user_id: this.config.userId || 'default',
          metadata: {
            ...metadata,
            timestamp: metadata.timestamp || new Date().toISOString(),
            project_id: this.config.projectId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add memory: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  // Recherche avancée avec filtres
  async search(
    query: string,
    filters?: {
      category?: string;
      subcategory?: string;
      tags?: string[];
      priority?: string;
      dateRange?: { start: Date; end: Date };
      customFilters?: Record<string, any>;
    }
  ): Promise<any[]> {
    try {
      const body: any = {
        query,
        user_id: this.config.userId || 'default',
        limit: 50
      };

      // Construire les filtres metadata
      if (filters) {
        const metadataFilters: any = {};

        if (filters.category) {
          metadataFilters.category = filters.category;
        }

        if (filters.subcategory) {
          metadataFilters.subcategory = filters.subcategory;
        }

        if (filters.tags && filters.tags.length > 0) {
          metadataFilters.tags = { $in: filters.tags };
        }

        if (filters.priority) {
          metadataFilters.priority = filters.priority;
        }

        if (filters.customFilters) {
          Object.assign(metadataFilters, filters.customFilters);
        }

        if (Object.keys(metadataFilters).length > 0) {
          body.filters = { metadata: metadataFilters };
        }
      }

      const response = await fetch(`${this.config.baseUrl}/memories/search/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // Obtenir les stats par catégorie
  async getCategoryStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const category of this.categories.values()) {
      try {
        const results = await this.search('', { category: category.id });
        stats[category.id] = results.length;

        // Stats par sous-catégorie
        if (category.subcategories) {
          for (const subcat of category.subcategories) {
            const subResults = await this.search('', {
              category: category.id,
              subcategory: subcat.id
            });
            stats[`${category.id}.${subcat.id}`] = subResults.length;
          }
        }
      } catch (error) {
        console.error(`Error getting stats for ${category.id}:`, error);
        stats[category.id] = 0;
      }
    }

    return stats;
  }

  // Obtenir les tags populaires
  async getPopularTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
    try {
      const allMemories = await this.search('');
      const tagCounts: Record<string, number> = {};

      allMemories.forEach(memory => {
        const tags = memory.metadata?.tags || [];
        tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting popular tags:', error);
      return [];
    }
  }

  // Ajouter une catégorie custom
  addCustomCategory(category: MemoryCategory) {
    this.categories.set(category.id, category);
  }

  // Ajouter une sous-catégorie
  addSubcategory(categoryId: string, subcategory: Subcategory) {
    const category = this.categories.get(categoryId);
    if (category) {
      if (!category.subcategories) {
        category.subcategories = [];
      }
      category.subcategories.push(subcategory);
    }
  }

  // Obtenir les features disponibles selon le plan
  getAvailableFeatures() {
    const plans = {
      FREE: {
        memories: 10000,
        retrieval_calls: 1000,
        custom_categories: true,
        tags: true,
        metadata: true,
        filtering: true,
        graph_memory: false,
        analytics: false,
        multi_projects: false
      },
      STARTER: {
        memories: 50000,
        retrieval_calls: 5000,
        custom_categories: 'unlimited',
        tags: 'unlimited',
        metadata: 'unlimited',
        filtering: 'advanced',
        graph_memory: false,
        analytics: false,
        multi_projects: false,
        support: 'community'
      },
      PRO: {
        memories: 'unlimited',
        retrieval_calls: 50000,
        custom_categories: 'unlimited',
        tags: 'unlimited',
        metadata: 'unlimited',
        filtering: 'advanced',
        graph_memory: true,
        analytics: true,
        multi_projects: true,
        support: 'private_slack'
      }
    };

    return plans[this.config.plan || 'STARTER'];
  }
}