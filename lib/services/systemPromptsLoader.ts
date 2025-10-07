import { htmlToMarkdown } from '@/lib/utils/htmlToMarkdown'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SystemPrompt {
  id: string
  name: string
  content: string
  category: string
  enabled: boolean
  priority: number
  createdAt: string
}

/**
 * Load active system prompts from Supabase
 * SERVER-SIDE ONLY (pour route.ts)
 */
export async function loadSystemPromptsFromDB(projectId: string): Promise<SystemPrompt[]> {
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading system prompts:', error)
      return []
    }

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      content: p.content,
      category: p.category || 'general',
      enabled: p.is_active,
      priority: p.sort_order,
      createdAt: p.created_at
    }))
  } catch (error) {
    console.error('Error loading system prompts:', error)
    return []
  }
}

/**
 * Build system prompt text (SERVER-SIDE)
 */
export async function buildSystemPromptsTextAsync(projectId: string): Promise<string> {
  const prompts = await loadSystemPromptsFromDB(projectId)

  console.log('🔍 System Prompts DB query result:', {
    projectId,
    count: prompts.length,
    prompts: prompts.map(p => ({ name: p.name, enabled: p.enabled, priority: p.priority }))
  })

  if (prompts.length === 0) {
    console.warn('⚠️ No active system prompts found for project:', projectId)
    return ''
  }

  const promptTexts = prompts.map(prompt => {
    const markdown = htmlToMarkdown(prompt.content)
    console.log(`📄 Including prompt "${prompt.name}" (${markdown.length} chars)`)
    return `# ${prompt.name}\n\n${markdown}`
  })

  return promptTexts.join('\n\n---\n\n')
}

/**
 * DEPRECATED: Load from localStorage (CLIENT-SIDE)
 * Kept for backward compatibility, will migrate to Supabase
 */
export function buildSystemPromptsText(projectId: string): string {
  if (typeof window === 'undefined') return ''

  const saved = localStorage.getItem(`system_prompts_${projectId}`)
  if (!saved) return ''

  try {
    const prompts: SystemPrompt[] = JSON.parse(saved)
    const activePrompts = prompts.filter(p => p.enabled)
    const sorted = activePrompts.sort((a, b) => a.priority - b.priority)

    if (sorted.length === 0) return ''

    const promptTexts = sorted.map(prompt => {
      const markdown = htmlToMarkdown(prompt.content)
      return `# ${prompt.name}\n\n${markdown}`
    })

    return promptTexts.join('\n\n---\n\n')
  } catch (error) {
    console.error('Error loading system prompts:', error)
    return ''
  }
}
