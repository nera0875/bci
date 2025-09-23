import { createServerClient } from '@/lib/supabase/client'

interface Chunk {
  content: string
  start: number
  end: number
  index: number
  metadata?: any
}

interface ChunkOptions {
  maxTokens?: number
  overlap?: number
  delimiter?: string
}

export class ChunkingService {
  private readonly DEFAULT_MAX_TOKENS = 500
  private readonly DEFAULT_OVERLAP = 50

  /**
   * Split text into intelligent chunks with overlap
   */
  splitIntoChunks(text: string, options: ChunkOptions = {}): Chunk[] {
    const maxTokens = options.maxTokens || this.DEFAULT_MAX_TOKENS
    const overlap = options.overlap || this.DEFAULT_OVERLAP
    const delimiter = options.delimiter || '\n\n'

    const chunks: Chunk[] = []

    // Try to split by sections first (markdown headers)
    const sections = this.splitBySections(text)

    if (sections.length > 1) {
      // Process each section
      sections.forEach((section, sectionIndex) => {
        const sectionChunks = this.splitByTokens(section.content, maxTokens, overlap)
        sectionChunks.forEach((chunk, chunkIndex) => {
          chunks.push({
            content: chunk.content,
            start: section.start + chunk.start,
            end: section.start + chunk.end,
            index: chunks.length,
            metadata: {
              section: section.title,
              sectionIndex,
              chunkIndex
            }
          })
        })
      })
    } else {
      // No sections found, split by tokens
      const tokenChunks = this.splitByTokens(text, maxTokens, overlap)
      tokenChunks.forEach((chunk, index) => {
        chunks.push({
          ...chunk,
          index
        })
      })
    }

    return chunks
  }

  /**
   * Split text by markdown sections
   */
  private splitBySections(text: string): Array<{ title: string; content: string; start: number }> {
    const sections: Array<{ title: string; content: string; start: number }> = []
    const headerRegex = /^(#{1,3})\s+(.+)$/gm

    let lastIndex = 0
    let match
    let lastTitle = 'Introduction'

    while ((match = headerRegex.exec(text)) !== null) {
      if (lastIndex < match.index) {
        sections.push({
          title: lastTitle,
          content: text.substring(lastIndex, match.index).trim(),
          start: lastIndex
        })
      }
      lastTitle = match[2]
      lastIndex = match.index
    }

    // Add the last section
    if (lastIndex < text.length) {
      sections.push({
        title: lastTitle,
        content: text.substring(lastIndex).trim(),
        start: lastIndex
      })
    }

    return sections.filter(s => s.content.length > 0)
  }

  /**
   * Split text by token count with overlap
   */
  private splitByTokens(text: string, maxTokens: number, overlap: number): Chunk[] {
    const chunks: Chunk[] = []
    const words = text.split(/\s+/)
    const avgCharsPerToken = 4 // Approximation

    const maxChars = maxTokens * avgCharsPerToken
    const overlapChars = overlap * avgCharsPerToken

    let start = 0
    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length)

      // Try to find a good break point (sentence end, paragraph)
      if (end < text.length) {
        const breakPoints = ['. ', '.\n', '\n\n', '! ', '? ']
        let bestBreak = end

        for (const breakPoint of breakPoints) {
          const lastBreak = text.lastIndexOf(breakPoint, end)
          if (lastBreak > start + maxChars / 2) {
            bestBreak = lastBreak + breakPoint.length
            break
          }
        }
        end = bestBreak
      }

      chunks.push({
        content: text.substring(start, end).trim(),
        start,
        end,
        index: chunks.length
      })

      // Move forward with overlap
      start = end - overlapChars
      if (start <= chunks[chunks.length - 1].start) {
        start = end
      }
    }

    return chunks
  }

  /**
   * Create content IDs for partial updates
   */
  createContentIds(text: string): string {
    const idRegex = /<content-id="([^"]+)">([\s\S]*?)<\/content-id>/g
    let processedText = text
    let idCounter = 0

    // Find sections without IDs
    const sectionRegex = /^(#{1,3})\s+(.+)$/gm
    let match

    while ((match = sectionRegex.exec(text)) !== null) {
      const sectionTitle = match[2]
      const sectionId = this.generateSectionId(sectionTitle, idCounter++)

      // Check if this section already has an ID
      if (!text.includes(`<content-id="${sectionId}"`)) {
        // Add content ID after the header
        const insertPosition = match.index + match[0].length
        processedText =
          processedText.slice(0, insertPosition) +
          `\n<content-id="${sectionId}">` +
          processedText.slice(insertPosition)
      }
    }

    // Close any open content IDs before next header
    processedText = processedText.replace(
      /(#{1,3}\s+.+\n<content-id="[^"]+">[\s\S]*?)(?=#{1,3}\s+|\z)/g,
      '$1</content-id>\n'
    )

    return processedText
  }

  /**
   * Generate section ID from title
   */
  private generateSectionId(title: string, index: number): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30)

    return `${cleanTitle}-${index}`
  }

  /**
   * Update specific section in text
   */
  updateSection(text: string, sectionId: string, newContent: string): string {
    const regex = new RegExp(
      `<content-id="${sectionId}">([\\s\\S]*?)<\\/content-id>`,
      'g'
    )

    return text.replace(regex, `<content-id="${sectionId}">${newContent}</content-id>`)
  }

  /**
   * Extract section by ID
   */
  extractSection(text: string, sectionId: string): string | null {
    const regex = new RegExp(
      `<content-id="${sectionId}">([\\s\\S]*?)<\\/content-id>`,
      'g'
    )

    const match = regex.exec(text)
    return match ? match[1].trim() : null
  }
}

/**
 * Store chunks in database
 */
export async function storeChunks(
  nodeId: string,
  chunks: Chunk[],
  generateEmbeddings = false
) {
  const supabase = createServerClient()

  // Delete existing chunks for this node
  await supabase
    .from('memory_chunks')
    .delete()
    .eq('node_id', nodeId)

  // Insert new chunks
  const chunkRecords = chunks.map(chunk => ({
    node_id: nodeId,
    chunk_index: chunk.index,
    content: chunk.content,
    start_position: chunk.start,
    end_position: chunk.end,
    metadata: chunk.metadata || {}
  }))

  const { error } = await supabase
    .from('memory_chunks')
    .insert(chunkRecords)

  if (error) {
    console.error('Error storing chunks:', error)
    throw error
  }

  // Generate embeddings if requested (requires OpenAI API)
  if (generateEmbeddings) {
    // TODO: Implement embedding generation
    // This would call OpenAI API to generate embeddings
    // and update the chunks with embedding vectors
  }
}

/**
 * Search similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  projectId: string,
  query: string,
  limit = 10
): Promise<any[]> {
  const supabase = createServerClient()

  // First, get embedding for query
  // TODO: Generate embedding for query text

  // For now, do text search as fallback
  const { data, error } = await supabase
    .from('memory_chunks')
    .select(`
      id,
      content,
      metadata,
      node_id,
      memory_nodes!inner(
        name,
        type,
        project_id
      )
    `)
    .eq('memory_nodes.project_id', projectId)
    .textSearch('content', query)
    .limit(limit)

  if (error) {
    console.error('Error searching chunks:', error)
    return []
  }

  return data || []
}

/**
 * Get cached chunks for quick access
 */
export async function getCachedChunks(limit = 10): Promise<any[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('memory_chunks_cache')
    .select(`
      chunk_id,
      access_count,
      last_accessed,
      memory_chunks!inner(
        id,
        content,
        metadata,
        node_id
      )
    `)
    .order('last_accessed', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error getting cached chunks:', error)
    return []
  }

  return data || []
}

/**
 * Update chunk cache on access
 */
export async function updateChunkCache(chunkId: string) {
  const supabase = createServerClient()

  // Check if already in cache
  const { data: existing } = await supabase
    .from('memory_chunks_cache')
    .select('id, access_count')
    .eq('chunk_id', chunkId)
    .single()

  if (existing) {
    // Update access count and timestamp
    await supabase
      .from('memory_chunks_cache')
      .update({
        access_count: existing.access_count + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Add to cache
    await supabase
      .from('memory_chunks_cache')
      .insert({
        chunk_id: chunkId,
        access_count: 1,
        last_accessed: new Date().toISOString()
      })
  }

  // Clean old cache entries (keep only top 100)
  const { data: oldEntries } = await supabase
    .from('memory_chunks_cache')
    .select('id')
    .order('last_accessed', { ascending: false })
    .range(100, 1000)

  if (oldEntries && oldEntries.length > 0) {
    await supabase
      .from('memory_chunks_cache')
      .delete()
      .in('id', oldEntries.map(e => e.id))
  }
}