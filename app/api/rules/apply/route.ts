import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { rule_id, node_id, projectId } = await request.json()

    if (!rule_id || !node_id || !projectId) {
      return NextResponse.json({ error: 'rule_id, node_id, projectId required' }, { status: 400 })
    }

    // Get rule
    const { data: rule } = await supabase
      .from('rules')
      .select('*')
      .eq('id', rule_id)
      .single()

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Get node
    const { data: node, error: nodeError } = await supabase
      .from('memory_nodes')
      .select('metadata')
      .eq('id', node_id)
      .eq('project_id', projectId)
      .single()

    if (nodeError) {
      return NextResponse.json({ error: 'Node not found or access denied' }, { status: 404 })
    }

    // Apply simple: add to metadata.applied_rules array
    const currentApplied = node.metadata?.applied_rules || []
    const updatedApplied = [...currentApplied, rule_id]

    const { data: updatedNode, error } = await supabase
      .from('memory_nodes')
      .update({
        metadata: {
          ...node.metadata,
          applied_rules: updatedApplied
        }
      })
      .eq('id', node_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Optionally, execute action if simple (e.g., if action is 'append_content', but for now, just tag
    // Log or something

    return NextResponse.json({ success: true, node: updatedNode, appliedRule: rule })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

