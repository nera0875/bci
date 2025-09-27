import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, nodeId, data } = body

    switch (action) {
      case 'create':
        const { data: newNode, error: createError } = await supabase
          .from('memory_nodes')
          .insert({
            project_id: projectId,
            parent_id: data.parent_id || null,
            name: data.name,
            type: data.type || 'document',
            content: data.content || null,
            icon: data.icon || '📄',
            color: data.color || '#6E6E80',
            metadata: data.metadata || {},
            position: 0
          })
          .select()
          .single()

        if (createError) throw createError
        return NextResponse.json({ success: true, node: newNode })

      case 'update':
        const updateData: any = {
          updated_at: new Date().toISOString()
        }
        
        // Merger les données à mettre à jour
        Object.keys(data).forEach(key => {
          updateData[key] = data[key]
        })

        const { error: updateError } = await supabase
          .from('memory_nodes')
          .update(updateData)
          .eq('id', nodeId)

        if (updateError) throw updateError
        return NextResponse.json({ success: true })

      case 'delete':
        const { error: deleteError } = await supabase
          .from('memory_nodes')
          .delete()
          .eq('id', nodeId)

        if (deleteError) throw deleteError
        return NextResponse.json({ success: true })

      case 'search':
        const { data: nodes, error: searchError } = await supabase
          .from('memory_nodes')
          .select('*')
          .eq('project_id', projectId)
          .ilike('name', `%${data.query}%`)

        if (searchError) throw searchError
        return NextResponse.json({ success: true, nodes })

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Memory update error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update memory' 
    }, { status: 500 })
  }
}
