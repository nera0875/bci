import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    // Verify user owns this project
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: project } = await (supabase as any)
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Export memory facts
    const { data: memoryFacts } = await (supabase as any)
      .from('memory_facts')
      .select('id, fact, metadata, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // Export memory nodes
    const { data: memoryNodes } = await (supabase as any)
      .from('memory_nodes')
      .select('id, name, type, section, content, metadata, color, icon, parent_id, position, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // Export memory categories
    const { data: memoryCategories } = await (supabase as any)
      .from('memory_categories')
      .select('id, key, label, icon, description, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // Export rule categories
    const { data: ruleCategories } = await (supabase as any)
      .from('rule_categories')
      .select('id, key, label, icon, description, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // Export rules
    const { data: rules } = await (supabase as any)
      .from('rules')
      .select('id, name, description, trigger_type, trigger_config, action_instructions, enabled, priority, category_id, icon, metadata, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // Export system prompts
    const { data: systemPrompts } = await (supabase as any)
      .from('system_prompts')
      .select('id, name, content, description, category, icon, is_active, sort_order, created_at, updated_at')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      projectId,
      data: {
        memoryFacts: memoryFacts || [],
        memoryNodes: memoryNodes || [],
        memoryCategories: memoryCategories || [],
        ruleCategories: ruleCategories || [],
        rules: rules || [],
        systemPrompts: systemPrompts || []
      },
      stats: {
        memoryFacts: memoryFacts?.length || 0,
        memoryNodes: memoryNodes?.length || 0,
        memoryCategories: memoryCategories?.length || 0,
        ruleCategories: ruleCategories?.length || 0,
        rules: rules?.length || 0,
        systemPrompts: systemPrompts?.length || 0
      }
    }

    return NextResponse.json(exportData)
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
