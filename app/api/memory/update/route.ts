import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, operation, data } = body

    switch (operation) {
      case 'create':
        const { error: createError } = await supabase
          .from('memory_nodes')
          .insert({
            project_id: projectId,
            parent_id: data.parent_id || null,
            name: data.name,
            type: data.type || 'document',
            content: data.content || null,
            icon: data.icon || '📄',
            color: data.color || '#6E6E80',
            metadata: data.metadata || {}
          })

        if (createError) throw createError
        break

      case 'update':
        const { error: updateError } = await supabase
          .from('memory_nodes')
          .update({
            content: data.content,
            metadata: data.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)

        if (updateError) throw updateError
        break

      case 'delete':
        const { error: deleteError } = await supabase
          .from('memory_nodes')
          .delete()
          .eq('id', data.id)

        if (deleteError) throw deleteError
        break

      case 'search':
        const { data: nodes, error: searchError } = await supabase
          .from('memory_nodes')
          .select('*')
          .eq('project_id', projectId)
          .ilike('name', `%${data.query}%`)

        if (searchError) throw searchError
        return NextResponse.json({ nodes })

      default:
        throw new Error('Invalid operation')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory update error:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
}