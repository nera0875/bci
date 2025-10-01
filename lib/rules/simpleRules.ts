// Système de règles simplifié pour BCI
// Une règle = une instruction simple que l'IA doit respecter
// Adapté pour utiliser la table 'rules' existante

export interface SimpleRule {
  id: string
  project_id: string
  name: string         // Nom de la règle
  description?: string // Description optionnelle
  trigger: string      // Dossier cible (ou "*" pour tous)
  action: string       // Instruction simple en français
  enabled: boolean     // Activé ou non
  priority: number     // Ordre d'application (1 = plus important)
  config?: Record<string, unknown>         // Configuration additionnelle
  metadata?: Record<string, unknown>       // Métadonnées incluant success_history
}

// Interface pour compatibilité avec l'ancien système
export interface LegacySimpleRule {
  id: string
  folder_name: string  // Nom du dossier (ou "*" pour tous)
  rule_text: string    // Instruction simple en français
  active: boolean      // Activé ou non
  priority: number     // Ordre d'application (1 = plus important)
}

// Fonction pour convertir SimpleRule vers LegacySimpleRule
export function toLegacyRule(rule: SimpleRule): LegacySimpleRule {
  return {
    id: rule.id,
    folder_name: rule.trigger,
    rule_text: rule.action,
    active: rule.enabled,
    priority: rule.priority
  }
}

// Fonction pour convertir LegacySimpleRule vers SimpleRule
export function fromLegacyRule(legacyRule: LegacySimpleRule, projectId: string): SimpleRule {
  return {
    id: legacyRule.id,
    project_id: projectId,
    name: `Règle ${legacyRule.folder_name}`,
    description: `Règle pour le dossier ${legacyRule.folder_name}`,
    trigger: legacyRule.folder_name,
    action: legacyRule.rule_text,
    enabled: legacyRule.active,
    priority: legacyRule.priority,
    config: {}
  }
}

// Exemples de règles simples (nouvelle structure)
export const exampleRules: SimpleRule[] = [
  {
    id: "1",
    project_id: "demo",
    name: "Documentation Structure",
    description: "Règle pour structurer la documentation",
    trigger: "Documentation",
    action: "Toujours créer des fichiers .md avec des titres # bien structurés",
    enabled: true,
    priority: 1
  },
  {
    id: "2",
    project_id: "demo", 
    name: "Code Comments",
    description: "Règle pour les commentaires de code",
    trigger: "Code",
    action: "Ajouter des commentaires en français dans le code",
    enabled: true,
    priority: 1
  },
  {
    id: "3",
    project_id: "demo",
    name: "Security Formatting",
    description: "Règle pour formater les failles de sécurité",
    trigger: "Sécurité",
    action: "Mettre # devant chaque faille trouvée pour bien les ranger",
    enabled: true,
    priority: 1
  },
  {
    id: "4",
    project_id: "demo",
    name: "Global Confirmation",
    description: "Règle globale de confirmation",
    trigger: "*",
    action: "Demander confirmation avant de supprimer quoi que ce soit",
    enabled: true,
    priority: 2
  }
]

// Fonction pour récupérer les règles d'un dossier
export function getRulesForFolder(folderName: string, allRules: SimpleRule[]): SimpleRule[] {
  return allRules
    .filter(rule => rule.enabled && (rule.trigger === folderName || rule.trigger === "*"))
    .sort((a, b) => a.priority - b.priority)
}

// Fonction pour formater les règles en instructions pour l'IA
export function formatRulesForAI(folderName: string, allRules: SimpleRule[]): string {
  const rules = getRulesForFolder(folderName, allRules)
  
  if (rules.length === 0) {
    return ""
  }

  let instructions = `\n## RÈGLES À RESPECTER pour le dossier "${folderName}":\n`
  
  rules.forEach((rule, index) => {
    instructions += `${index + 1}. ${rule.action}\n`
  })
  
  instructions += "\nRESPECTE CES RÈGLES ABSOLUMENT dans toutes tes actions.\n"
  
  return instructions
}

// Fonction pour vérifier si une action respecte les règles (optionnel)
export function checkActionAgainstRules(
  action: string,
  folderName: string, 
  allRules: SimpleRule[]
): { allowed: boolean; warnings: string[] } {
  const rules = getRulesForFolder(folderName, allRules)
  const warnings: string[] = []
  
  // Vérifications simples basées sur les mots-clés
  for (const rule of rules) {
    if (rule.action.includes("confirmation") && action.includes("supprimer")) {
      warnings.push(`Attention: ${rule.action}`)
    }
    
    if (rule.action.includes(".md") && action.includes("créer") && !action.includes(".md")) {
      warnings.push(`Attention: ${rule.action}`)
    }
  }
  
  return {
    allowed: true, // On bloque pas, on avertit juste
    warnings
  }
}

export const globalRules = [
  {
    id: 'type-required',
    check: (node: any) => node.type !== undefined && node.type !== '',
    message: 'Type requis pour tous les nœuds'
  },
  {
    id: 'markdown-required',
    check: (node: any) => node.section === 'rules' ? (node.content || '').includes('#') : true,
    message: 'Les règles doivent commencer par un titre # en Markdown'
  },
  {
    id: 'title-required',
    check: (node: any) => node.name && node.name.trim() !== '',
    message: 'Titre requis pour tous les nœuds'
  },
  {
    id: 'section-valid',
    check: (node: any) => ['rules', 'memory', 'optimization'].includes(node.section || ''),
    message: 'Section doit être rules, memory ou optimization'
  }
]