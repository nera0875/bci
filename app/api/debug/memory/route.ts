import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  const supabase = createClient()

  const projectId = 'default-project-001'

  // Get all memory nodes
  const { data: nodes, error } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build tree structure
  const buildTree = (parentId: string | null = null): any[] => {
    const children = nodes?.filter(n => n.parent_id === parentId) || []
    return children.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      content: node.content,
      children: buildTree(node.id)
    }))
  }

  const tree = buildTree(null)

  return NextResponse.json({
    totalNodes: nodes?.length || 0,
    nodes: nodes,
    tree: tree
  })
}