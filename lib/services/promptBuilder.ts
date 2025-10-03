import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

interface BuildPromptParams {
  projectId: string
  userMessage: string
  conversationHistory?: Array<{ role: string; content: string }>
}

interface PromptResult {
  systemPrompt: string
  context: string
  rulesCount: number
  memoryCount: number
  patternsCount: number
}

/**
 * PROMPT BUILDER ROBUSTE
 * Ordre strict: Rules → Memory (RAG) → Learning → User Message
 */
export async function buildRobustPrompt(params: BuildPromptParams): Promise<PromptResult> {
  const { projectId, userMessage } = params

  // 1. DÉTECTER CONTEXTE via Brain
  const context = await detectContext(userMessage)

  // 2. CHARGER RULES ACTIVES (Priority DESC)
  const { data: rules } = await supabase
    .from('rules')
    .select('*')
    .eq('project_id', projectId)
    .eq('enabled', true)
    .or(`trigger.eq.${context},trigger.eq.*`)
    .order('priority', { ascending: false })

  const rulesSection = rules && rules.length > 0 ? `
## 🎯 RÈGLES ACTIVES (à respecter absolument)

${rules.map((r, i) => `
### ${i + 1}. ${r.name} (Priority: ${r.priority})
**Trigger:** ${r.trigger}
**Action:**
${r.action}
`).join('\n')}
` : ''

  // 3. CHARGER MÉMOIRE SIMILAIRE (RAG via embeddings)
  let memorySection = ''
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userMessage,
      encoding_format: 'float'
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    const { data: similarMemory } = await supabase.rpc('match_memory_nodes', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3,
      p_project_id: projectId
    })

    if (similarMemory && similarMemory.length > 0) {
      memorySection = `
## 📚 MÉMOIRE (tests similaires passés)

${similarMemory.map((m: any, i: number) => `
### ${i + 1}. ${m.name || 'Document'} (${(m.similarity * 100).toFixed(0)}% match)
${m.content || ''}
`).join('\n')}
`
    }
  } catch (error) {
    console.error('RAG search failed:', error)
  }

  // 4. CHARGER LEARNING STATS (attack_patterns)
  const { data: patterns } = await supabase
    .from('attack_patterns')
    .select('*')
    .eq('project_id', projectId)
    .eq('context', context)
    .order('success_rate', { ascending: false })
    .limit(5)

  const learningSection = patterns && patterns.length > 0 ? `
## 📊 STATISTIQUES LEARNING (ce qui marche)

${patterns.map((p: any) => `
- **${p.pattern_type}**: ${(p.success_rate * 100).toFixed(0)}% success (${p.usage_count} tests)${p.last_success ? ` - Dernier succès: ${new Date(p.last_success).toLocaleDateString('fr-FR')}` : ''}
`).join('\n')}
` : ''

  // 5. CONSTRUIRE PROMPT FINAL
  const systemPrompt = `# TU ES UN EXPERT PENTESTER BUSINESS LOGIC

Tu aides l'utilisateur à trouver des failles de logique métier (Business Logic Vulnerabilities).

## MINDSET OBLIGATOIRE
- Pense comme un fraudeur, pas un développeur
- Cherche ce qui est "légalement permis mais non souhaité"
- Focus sur l'abus de fonctionnalités légitimes
- Ignore les bugs techniques classiques (XSS, SQLi) sauf si explicitement demandé

${rulesSection}

${memorySection}

${learningSection}

## 📝 INSTRUCTIONS GÉNÉRALES

1. **Analyse systématique**: Comprendre le modèle économique, identifier flux monétaires, mapper rôles/privilèges
2. **Questions critiques**: Peut-on bypasser des étapes ? Valeurs négatives/extrêmes ? Combiner features ? Race conditions ? Limites client-only ?
3. **Tests prioritaires**: Prix/quantités, restrictions temporelles, codes promo, élévation privilèges, double dépense

Pour chaque bug trouvé, explique:
- Scénario d'exploitation
- Impact business réel
- Étapes de reproduction
- Criticité entreprise

## 🎯 CONTEXTE DÉTECTÉ: ${context}

Réponds maintenant au user.`

  return {
    systemPrompt,
    context,
    rulesCount: rules?.length || 0,
    memoryCount: (similarMemory as any)?.length || 0,
    patternsCount: patterns?.length || 0
  }
}

/**
 * Détecte le contexte d'une question
 */
async function detectContext(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase()

  // Business Logic keywords
  if (
    lowerMessage.includes('prix') ||
    lowerMessage.includes('price') ||
    lowerMessage.includes('quantit') ||
    lowerMessage.includes('quantity') ||
    lowerMessage.includes('discount') ||
    lowerMessage.includes('promo') ||
    lowerMessage.includes('cart') ||
    lowerMessage.includes('panier') ||
    lowerMessage.includes('checkout') ||
    lowerMessage.includes('payment')
  ) {
    return 'business-logic'
  }

  // Authentication
  if (
    lowerMessage.includes('login') ||
    lowerMessage.includes('auth') ||
    lowerMessage.includes('password') ||
    lowerMessage.includes('session') ||
    lowerMessage.includes('token') ||
    lowerMessage.includes('connexion')
  ) {
    return 'authentication'
  }

  // API Testing
  if (
    lowerMessage.includes('api') ||
    lowerMessage.includes('endpoint') ||
    lowerMessage.includes('rest') ||
    lowerMessage.includes('graphql') ||
    lowerMessage.includes('json')
  ) {
    return 'api'
  }

  // XSS
  if (
    lowerMessage.includes('xss') ||
    lowerMessage.includes('script') ||
    lowerMessage.includes('inject')
  ) {
    return 'xss'
  }

  // SQLi
  if (
    lowerMessage.includes('sql') ||
    lowerMessage.includes('database') ||
    lowerMessage.includes('query')
  ) {
    return 'sqli'
  }

  // IDOR
  if (
    lowerMessage.includes('idor') ||
    lowerMessage.includes('object') ||
    lowerMessage.includes('/user/') ||
    lowerMessage.includes('/id/')
  ) {
    return 'idor'
  }

  return 'general'
}
