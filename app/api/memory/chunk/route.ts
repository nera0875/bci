import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { ChunkingService, storeChunks, searchSimilarChunks } from '@/lib/services/chunking'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, nodeId, content, sectionId, query, projectId } = body

    const chunkingService = new ChunkingService()
    const supabase = createServerClient()

    switch (operation) {
      case 'chunk': {
        // Split content into chunks and store
        const chunks = chunkingService.splitIntoChunks(content)
        await storeChunks(nodeId, chunks)

        return NextResponse.json({
          success: true,
          chunks: chunks.length,
          message: `Created ${chunks.length} chunks`
        })
      }

      case 'update-section': {
        // Update specific section in a document
        const { data: node } = await supabase
          .from('memory_nodes')
          .select('content')
          .eq('id', nodeId)
          .single()

        if (!node) {
          return NextResponse.json({ error: 'Node not found' }, { status: 404 })
        }

        const currentContent = typeof node.content === 'string' ? node.content : ''
        const updatedContent = chunkingService.updateSection(currentContent, sectionId, content)

        // Update node
        await supabase
          .from('memory_nodes')
          .update({ content: updatedContent, updated_at: new Date().toISOString() })
          .eq('id', nodeId)

        // Re-chunk the updated content
        const newChunks = chunkingService.splitIntoChunks(updatedContent)
        await storeChunks(nodeId, newChunks)

        return NextResponse.json({
          success: true,
          message: 'Section updated successfully'
        })
      }

      case 'add-ids': {
        // Add content IDs to existing document
        const { data: node } = await supabase
          .from('memory_nodes')
          .select('content')
          .eq('id', nodeId)
          .single()

        if (!node) {
          return NextResponse.json({ error: 'Node not found' }, { status: 404 })
        }

        const currentContent = typeof node.content === 'string' ? node.content : ''
        const contentWithIds = chunkingService.createContentIds(currentContent)

        // Update node with IDs
        await supabase
          .from('memory_nodes')
          .update({ content: contentWithIds, updated_at: new Date().toISOString() })
          .eq('id', nodeId)

        return NextResponse.json({
          success: true,
          message: 'Content IDs added successfully'
        })
      }

      case 'search': {
        // Search for similar chunks
        const results = await searchSimilarChunks(projectId, query, 10)

        return NextResponse.json({
          success: true,
          results
        })
      }

      case 'get-section': {
        // Extract specific section
        const { data: node } = await supabase
          .from('memory_nodes')
          .select('content')
          .eq('id', nodeId)
          .single()

        if (!node) {
          return NextResponse.json({ error: 'Node not found' }, { status: 404 })
        }

        const currentContent = typeof node.content === 'string' ? node.content : ''
        const section = chunkingService.extractSection(currentContent, sectionId)

        return NextResponse.json({
          success: true,
          content: section
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }
  } catch (error) {
    console.error('Chunking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nodeId = searchParams.get('nodeId')
    const projectId = searchParams.get('projectId')

    const supabase = createServerClient()

    if (nodeId) {
      // Get chunks for specific node
      const { data, error } = await supabase
        .from('memory_chunks')
        .select('*')
        .eq('node_id', nodeId)
        .order('chunk_index')

      if (error) throw error

      return NextResponse.json({
        success: true,
        chunks: data
      })
    } else if (projectId) {
      // Get all chunks for project
      const { data, error } = await supabase
        .from('memory_chunks')
        .select(`
          *,
          memory_nodes!inner(
            name,
            type,
            project_id
          )
        `)
        .eq('memory_nodes.project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return NextResponse.json({
        success: true,
        chunks: data
      })
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  } catch (error) {
    console.error('Chunking GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}