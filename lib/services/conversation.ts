import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase/client'
import { createEmbedding } from '@/lib/services/embeddings'

interface Message {
  role: 'user' | 'assistant'
  content: string
  metadata?: any
}

interface ConversationContext {
  recentMessages: Message[]  // 5-10 derniers
  similarMessages: Message[]  // Messages similaires par embedding
  summary?: string            // Résumé si conversation longue
  memoryContext: any[]        // Mémoire permanente
  cachedResponse?: string     // Si message identique trouvé
}

export class ConversationManager {
  private conversationId: string | null = null
  private projectId: string
  private messageCount = 0

  constructor(projectId: string) {
    this.projectId = projectId
  }

  // Initialiser ou récupérer une conversation
  async initConversation(conversationId?: string) {
    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (data) {
        this.conversationId = data.id
        this.messageCount = data.message_count
        return data
      }
    }

    // Créer nouvelle conversation
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        project_id: this.projectId,
        title: `Conversation ${day}/${month}/${year}`,
        message_count: 0,
        is_active: true
      })
      .select()
      .single()

    if (data) {
      this.conversationId = data.id
      this.messageCount = 0
    }

    return data
  }

  // Hasher un message pour déduplication
  private hashContent(content: string): string {
    return createHash('sha256').update(content.trim().toLowerCase()).digest('hex')
  }

  // Vérifier si on a déjà une réponse en cache
  async checkCache(content: string, forceRefresh: boolean = false): Promise<string | null> {
    if (forceRefresh) {
      return null // Skip cache si forceRefresh
    }

    const hash = this.hashContent(content)

    const { data, error } = await supabase
      .from('message_cache')
      .select('response, usage_count')
      .eq('content_hash', hash)
      .maybeSingle() // Use maybeSingle instead of single to avoid 406 errors

    if (data && !error) {
      // Incrémenter le compteur d'usage
      await supabase
        .from('message_cache')
        .update({
          usage_count: (data.usage_count || 0) + 1,
          last_used: new Date().toISOString()
        })
        .eq('content_hash', hash)

      console.log('💰 Économie de tokens! Message identique trouvé en cache')
      // response est jsonb en base, peut être string ou object
      if (typeof data.response === 'string') {
        return data.response
      } else if (typeof data.response === 'object' && data.response !== null) {
        // Si c'est un objet avec une propriété content, extraire content
        return (data.response as any).content || JSON.stringify(data.response)
      }
      return JSON.stringify(data.response)
    }

    return null
  }

  // Sauvegarder un message avec embedding
  async saveMessage(message: Message, embedding?: number[]) {
    if (!this.conversationId) return

    const hash = this.hashContent(message.content)

    // Vérifier si le message existe déjà (fix 409 Conflict)
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('content_hash', hash)
      .eq('conversation_id', this.conversationId)
      .maybeSingle()

    if (existing) {
      console.log('Message duplicate skipped (hash exists):', hash)
      return // Skip insert si duplicate
    }

    // Créer embedding si pas fourni
    if (!embedding && message.content.length > 10) {
      try {
        embedding = await createEmbedding(message.content)
      } catch (e) {
        console.log('Embedding creation skipped (API error):', e)
        // Continue sans embedding - pas critique
        embedding = undefined
      }
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: this.conversationId,
        project_id: this.projectId,
        role: message.role,
        content: message.content,
        content_hash: hash,
        embedding: embedding,
        metadata: message.metadata,
        token_count: Math.ceil(message.content.length / 4) // Estimation
      })
      .select()

    if (!error) {
      this.messageCount++

      // Mettre à jour le compteur
      await supabase
        .from('conversations')
        .update({
          message_count: this.messageCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.conversationId)
      console.log('Message saved successfully')
    } else {
      console.error('Failed to save message:', error)
    }
  }

  // Obtenir le contexte optimisé pour Claude
  async getOptimizedContext(currentMessage: string, forceRefresh: boolean = true): Promise<ConversationContext> {
    const context: ConversationContext = {
      recentMessages: [],
      similarMessages: [],
      memoryContext: []
    }

    // 1. Vérifier le cache d'abord
    const cachedResponse = await this.checkCache(currentMessage, forceRefresh)
    if (cachedResponse) {
      context.cachedResponse = cachedResponse
      return context // Pas besoin du reste si on a la réponse!
    }

    // 2. Récupérer les messages récents (fenêtre glissante)
    if (this.conversationId) {
      const { data: recent } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', this.conversationId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recent) {
        context.recentMessages = recent.reverse()
      }
    }

    // 3. Chercher les messages similaires par embedding
    try {
      const queryEmbedding = await createEmbedding(currentMessage)

      // Si on a réussi à créer l'embedding
      if (queryEmbedding && queryEmbedding.length > 0) {
        const { data: similar } = await supabase.rpc('search_similar_messages', {
          query_embedding: queryEmbedding,
          project_uuid: this.projectId,
          similarity_threshold: 0.8,
          limit_count: 3
        })

        if (similar) {
          context.similarMessages = similar
        }
      }
    } catch (e) {
      console.log('Similarity search skipped (embedding error):', e)
      // Continue sans recherche de similarité - pas critique
    }

    // 4. Si conversation longue, récupérer/générer un résumé
    if (this.messageCount > 30) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('summary')
        .eq('id', this.conversationId)
        .single()

      if (conv?.summary) {
        context.summary = conv.summary
      } else {
        // Générer un résumé (à implémenter)
        context.summary = await this.generateSummary()
      }
    }

    return context
  }

  // Générer un résumé de la conversation
  private async generateSummary(): Promise<string> {
    if (!this.conversationId) return ''

    // Récupérer tous les messages
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', this.conversationId)
      .order('created_at')
      .limit(50)

    if (!messages || messages.length === 0) return ''

    // Simple résumé pour l'instant
    const topics = new Set<string>()
    messages.forEach(msg => {
      // Extraire les mots-clés importants
      const keywords = msg.content.match(/\b[A-Z][a-z]+\b/g) || []
      keywords.forEach(k => topics.add(k))
    })

    const summary = `Conversation sur: ${Array.from(topics).slice(0, 5).join(', ')}`

    // Sauvegarder le résumé
    await supabase
      .from('conversations')
      .update({ summary })
      .eq('id', this.conversationId)

    return summary
  }

  // Sauvegarder la réponse en cache
  async cacheResponse(message: string, response: string) {
    const hash = this.hashContent(message)

    // Créer embedding pour la réponse (optionnel)
    let responseEmbedding
    try {
      responseEmbedding = await createEmbedding(response)
    } catch (e) {
      console.log('Response embedding skipped (API error):', e)
      // Continue sans embedding - le cache fonctionnera quand même avec le hash
      responseEmbedding = undefined
    }

    // Vérifier si existe déjà
    const { data: existing } = await supabase
      .from('message_cache')
      .select('id, usage_count')
      .eq('content_hash', hash)
      .maybeSingle()

    if (existing) {
      // Mettre à jour l'existant
      await supabase
        .from('message_cache')
        .update({
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // Créer nouveau
      await supabase
        .from('message_cache')
        .insert({
          content_hash: hash,
          response: response,
          response_embedding: responseEmbedding,
          usage_count: 1,
          last_used: new Date().toISOString()
        })
    }
  }

  // Nettoyer les vieux caches
  async cleanOldCache(daysOld = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    await supabase
      .from('message_cache')
      .delete()
      .lt('last_used', cutoffDate.toISOString())
      .eq('usage_count', 1) // Garder les messages souvent utilisés
  }
}

// Helper pour formatter le contexte pour Claude
export function formatContextForClaude(context: ConversationContext): string {
  let formatted = ''

  if (context.summary) {
    formatted += `## Résumé de la conversation précédente:\n${context.summary}\n\n`
  }

  if (context.similarMessages.length > 0) {
    formatted += `## Messages similaires précédents:\n`
    context.similarMessages.forEach(msg => {
      formatted += `- ${msg.role}: ${msg.content.substring(0, 100)}...\n`
    })
    formatted += '\n'
  }

  return formatted
}