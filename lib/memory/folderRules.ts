// Système de règles contextuelles par dossier
// Permet de définir des règles spécifiques que Claude doit respecter pour chaque dossier

export interface FolderRule {
  name: string
  trigger: string
  action: string
  description: string
  allowedOperations?: ('create' | 'update' | 'append' | 'delete')[]
  requiredConfirmation?: boolean
  customValidation?: (data: any) => boolean | string
}

export interface FolderRuleSet {
  folderId?: string
  folderName: string
  folderPath?: string
  rules: FolderRule[]
}

// Règles par défaut pour certains dossiers
export const defaultFolderRules: FolderRuleSet[] = [
  {
    folderName: 'System',
    rules: [
      {
        name: 'no-delete',
        trigger: 'delete',
        action: 'block',
        description: 'Impossible de supprimer dans le dossier System',
        allowedOperations: ['create', 'update', 'append'],
      },
      {
        name: 'require-confirmation',
        trigger: 'any',
        action: 'confirm',
        description: 'Toute action dans System requiert confirmation',
        requiredConfirmation: true,
      }
    ]
  },
  {
    folderName: 'Bivon',
    rules: [
      {
        name: 'feed-parser',
        trigger: '/feed',
        action: 'parse_http',
        description: 'Parse HTTP feeds automatiquement dans Bivon',
        allowedOperations: ['create', 'update'],
      },
      {
        name: 'structured-content',
        trigger: 'create',
        action: 'validate_structure',
        description: 'Contenu doit être structuré en sections',
        customValidation: (data) => {
          if (data.content && !data.content.includes('#')) {
            return 'Le contenu doit contenir au moins un titre (#)'
          }
          return true
        }
      }
    ]
  },
  {
    folderName: 'Documentation',
    rules: [
      {
        name: 'markdown-only',
        trigger: 'create',
        action: 'validate_type',
        description: 'Seuls les fichiers .md sont autorisés',
        customValidation: (data) => {
          if (data.name && !data.name.endsWith('.md')) {
            return 'Seuls les fichiers Markdown sont autorisés dans Documentation'
          }
          return true
        }
      }
    ]
  },
  {
    folderName: 'Private',
    rules: [
      {
        name: 'no-ai-access',
        trigger: 'any',
        action: 'block',
        description: 'Claude ne peut pas modifier le dossier Private',
        allowedOperations: [],
      }
    ]
  }
]

// Fonction pour vérifier si une action est autorisée selon les règles
export function checkFolderRules(
  action: { operation: string; data: any },
  folderName: string | null,
  userRules?: FolderRuleSet[]
): { allowed: boolean; reason?: string; requiresConfirmation?: boolean } {

  // Combiner les règles par défaut avec les règles utilisateur
  const allRules = [...defaultFolderRules, ...(userRules || [])]

  // Trouver les règles pour ce dossier
  const folderRuleSet = allRules.find(
    rs => rs.folderName === folderName ||
         rs.folderPath === folderName
  )

  if (!folderRuleSet) {
    // Pas de règles spécifiques, tout est autorisé
    return { allowed: true }
  }

  let requiresConfirmation = false

  // Vérifier chaque règle
  for (const rule of folderRuleSet.rules) {
    // Vérifier le trigger
    if (rule.trigger === 'any' ||
        rule.trigger === action.operation ||
        (action.data.content && action.data.content.includes(rule.trigger))) {

      // Appliquer l'action de la règle
      if (rule.action === 'block') {
        return {
          allowed: false,
          reason: rule.description
        }
      }

      if (rule.action === 'confirm') {
        requiresConfirmation = true
      }

      // Vérifier les opérations autorisées
      if (rule.allowedOperations &&
          !rule.allowedOperations.includes(action.operation as any)) {
        return {
          allowed: false,
          reason: `Opération '${action.operation}' non autorisée dans ${folderName}`
        }
      }

      // Validation personnalisée
      if (rule.customValidation) {
        const validationResult = rule.customValidation(action.data)
        if (typeof validationResult === 'string') {
          return {
            allowed: false,
            reason: validationResult
          }
        }
        if (!validationResult) {
          return {
            allowed: false,
            reason: 'Validation personnalisée échouée'
          }
        }
      }

      if (rule.requiredConfirmation) {
        requiresConfirmation = true
      }
    }
  }

  return {
    allowed: true,
    requiresConfirmation
  }
}

// Fonction pour charger les règles utilisateur depuis la base
export async function loadUserFolderRules(
  projectId: string
): Promise<FolderRuleSet[]> {
  // TODO: Charger depuis Supabase table 'folder_rules'
  // Pour l'instant, retourner un tableau vide
  return []
}

// Fonction pour sauvegarder les règles utilisateur
export async function saveFolderRules(
  projectId: string,
  folderName: string,
  rules: FolderRule[]
): Promise<boolean> {
  // TODO: Sauvegarder dans Supabase table 'folder_rules'
  console.log('Saving folder rules for', folderName, rules)
  return true
}