import { htmlToMarkdown } from '@/lib/utils/htmlToMarkdown'

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
 * Load active system prompts for a project
 * Returns prompts sorted by priority (1, 2, 3...)
 * Converts HTML content to Markdown for LLM
 */
export function loadSystemPrompts(projectId: string): SystemPrompt[] {
  if (typeof window === 'undefined') return []

  const saved = localStorage.getItem(`system_prompts_${projectId}`)
  if (!saved) return []

  try {
    const prompts: SystemPrompt[] = JSON.parse(saved)

    // Filter enabled prompts only
    const activePrompts = prompts.filter(p => p.enabled)

    // Sort by priority (1 first, then 2, 3, ...)
    const sorted = activePrompts.sort((a, b) => a.priority - b.priority)

    return sorted
  } catch (error) {
    console.error('Error loading system prompts:', error)
    return []
  }
}

/**
 * Build final system prompt by combining all active prompts
 * Converts HTML to Markdown and joins with separator
 */
export function buildSystemPromptsText(projectId: string): string {
  const prompts = loadSystemPrompts(projectId)

  if (prompts.length === 0) return ''

  const promptTexts = prompts.map(prompt => {
    // Convert HTML to Markdown (removes colors, keeps structure)
    const markdown = htmlToMarkdown(prompt.content)

    return `# ${prompt.name}\n\n${markdown}`
  })

  // Join all prompts with separator
  return promptTexts.join('\n\n---\n\n')
}

/**
 * Inject system prompts into the messages array
 * Should be called before sending to LLM API
 */
export function injectSystemPrompts(projectId: string, existingSystemPrompt?: string): string {
  const systemPromptsText = buildSystemPromptsText(projectId)

  if (!systemPromptsText) return existingSystemPrompt || ''

  if (existingSystemPrompt) {
    // Prepend system prompts before existing system prompt
    return `${systemPromptsText}\n\n---\n\n${existingSystemPrompt}`
  }

  return systemPromptsText
}
