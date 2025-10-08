import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { projectId, data, mode = 'skip' } = body // mode: 'skip' | 'replace' | 'merge'

    if (!projectId || !data) {
      return NextResponse.json({ error: 'projectId and data required' }, { status: 400 })
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

    const stats = {
      memoryFacts: { imported: 0, skipped: 0, errors: 0 },
      memoryNodes: { imported: 0, skipped: 0, errors: 0 },
      memoryCategories: { imported: 0, skipped: 0, errors: 0 },
      ruleCategories: { imported: 0, skipped: 0, errors: 0 },
      rules: { imported: 0, skipped: 0, errors: 0 },
      systemPrompts: { imported: 0, skipped: 0, errors: 0 }
    }

    // Helper function to generate content hash
    const generateHash = (content: string) => {
      return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16)
    }

    // Import Memory Categories first (needed for memoryFacts)
    if (data.memoryCategories?.length > 0) {
      for (const category of data.memoryCategories) {
        try {
          // Check if exists by key
          const { data: existing } = await (supabase as any)
            .from('memory_categories')
            .select('id')
            .eq('project_id', projectId)
            .eq('key', category.key)
            .single()

          if (existing && mode === 'skip') {
            stats.memoryCategories.skipped++
            continue
          }

          if (existing && mode === 'replace') {
            await (supabase as any)
              .from('memory_categories')
              .update({
                label: category.label,
                icon: category.icon,
                description: category.description,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            stats.memoryCategories.imported++
          } else if (!existing) {
            const { id, created_at, updated_at, ...insertData } = category
            await (supabase as any)
              .from('memory_categories')
              .insert({
                ...insertData,
                project_id: projectId
              })
            stats.memoryCategories.imported++
          }
        } catch (error) {
          console.error('Error importing memory category:', error)
          stats.memoryCategories.errors++
        }
      }
    }

    // Import Rule Categories (needed for rules)
    if (data.ruleCategories?.length > 0) {
      for (const category of data.ruleCategories) {
        try {
          const { data: existing } = await (supabase as any)
            .from('rule_categories')
            .select('id')
            .eq('project_id', projectId)
            .eq('key', category.key)
            .single()

          if (existing && mode === 'skip') {
            stats.ruleCategories.skipped++
            continue
          }

          if (existing && mode === 'replace') {
            await (supabase as any)
              .from('rule_categories')
              .update({
                label: category.label,
                icon: category.icon,
                description: category.description,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            stats.ruleCategories.imported++
          } else if (!existing) {
            const { id, created_at, updated_at, ...insertData } = category
            await (supabase as any)
              .from('rule_categories')
              .insert({
                ...insertData,
                project_id: projectId
              })
            stats.ruleCategories.imported++
          }
        } catch (error) {
          console.error('Error importing rule category:', error)
          stats.ruleCategories.errors++
        }
      }
    }

    // Import Memory Nodes
    if (data.memoryNodes?.length > 0) {
      for (const node of data.memoryNodes) {
        try {
          // Check if exists by name and type
          const { data: existing } = await (supabase as any)
            .from('memory_nodes')
            .select('id')
            .eq('project_id', projectId)
            .eq('name', node.name)
            .eq('type', node.type)
            .single()

          if (existing && mode === 'skip') {
            stats.memoryNodes.skipped++
            continue
          }

          if (existing && mode === 'replace') {
            await (supabase as any)
              .from('memory_nodes')
              .update({
                content: node.content,
                metadata: node.metadata,
                color: node.color,
                icon: node.icon,
                parent_id: node.parent_id,
                position: node.position,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            stats.memoryNodes.imported++
          } else if (!existing) {
            const { id, created_at, updated_at, ...insertData } = node
            await (supabase as any)
              .from('memory_nodes')
              .insert({
                ...insertData,
                project_id: projectId
              })
            stats.memoryNodes.imported++
          }
        } catch (error) {
          console.error('Error importing memory node:', error)
          stats.memoryNodes.errors++
        }
      }
    }

    // Import Memory Facts
    if (data.memoryFacts?.length > 0) {
      for (const fact of data.memoryFacts) {
        try {
          // Generate content hash for deduplication
          const contentHash = generateHash(
            `${fact.fact}|${fact.metadata?.endpoint || ''}|${fact.metadata?.technique || ''}`
          )

          const { data: existing } = await (supabase as any)
            .from('memory_facts')
            .select('id')
            .eq('project_id', projectId)
            .eq('content_hash', contentHash)
            .single()

          if (existing && mode === 'skip') {
            stats.memoryFacts.skipped++
            continue
          }

          if (existing && mode === 'replace') {
            await (supabase as any)
              .from('memory_facts')
              .update({
                fact: fact.fact,
                metadata: fact.metadata,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            stats.memoryFacts.imported++
          } else if (!existing) {
            const { id, created_at, updated_at, embedding, ...insertData } = fact
            await (supabase as any)
              .from('memory_facts')
              .insert({
                ...insertData,
                project_id: projectId,
                content_hash: contentHash
              })
            stats.memoryFacts.imported++
          }
        } catch (error) {
          console.error('Error importing memory fact:', error)
          stats.memoryFacts.errors++
        }
      }
    }

    // Import Rules (need to map category_id if it changed)
    if (data.rules?.length > 0) {
      for (const rule of data.rules) {
        try {
          // Check if exists by name
          const { data: existing } = await (supabase as any)
            .from('rules')
            .select('id')
            .eq('project_id', projectId)
            .eq('name', rule.name)
            .single()

          if (existing && mode === 'skip') {
            stats.rules.skipped++
            continue
          }

          // If rule has category_id, try to find matching category by key
          let newCategoryId = null
          if (rule.category_id && data.ruleCategories) {
            const originalCategory = data.ruleCategories.find((c: any) => c.id === rule.category_id)
            if (originalCategory) {
              const { data: newCategory } = await (supabase as any)
                .from('rule_categories')
                .select('id')
                .eq('project_id', projectId)
                .eq('key', originalCategory.key)
                .single()
              newCategoryId = newCategory?.id || null
            }
          }

          if (existing && mode === 'replace') {
            await (supabase as any)
              .from('rules')
              .update({
                description: rule.description,
                trigger_type: rule.trigger_type,
                trigger_config: rule.trigger_config,
                action_instructions: rule.action_instructions,
                enabled: rule.enabled,
                priority: rule.priority,
                category_id: newCategoryId,
                icon: rule.icon,
                metadata: rule.metadata,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            stats.rules.imported++
          } else if (!existing) {
            const { id, created_at, updated_at, category_id, ...insertData } = rule
            await (supabase as any)
              .from('rules')
              .insert({
                ...insertData,
                project_id: projectId,
                category_id: newCategoryId
              })
            stats.rules.imported++
          }
        } catch (error) {
          console.error('Error importing rule:', error)
          stats.rules.errors++
        }
      }
    }

    // Import System Prompts
    if (data.systemPrompts?.length > 0) {
      for (const prompt of data.systemPrompts) {
        try {
          const { data: existing } = await (supabase as any)
            .from('system_prompts')
            .select('id')
            .eq('project_id', projectId)
            .eq('name', prompt.name)
            .single()

          if (existing && mode === 'skip') {
            stats.systemPrompts.skipped++
            continue
          }

          if (existing && mode === 'replace') {
            await (supabase as any)
              .from('system_prompts')
              .update({
                content: prompt.content,
                description: prompt.description,
                category: prompt.category,
                icon: prompt.icon,
                is_active: prompt.is_active,
                sort_order: prompt.sort_order,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            stats.systemPrompts.imported++
          } else if (!existing) {
            const { id, created_at, updated_at, ...insertData } = prompt
            await (supabase as any)
              .from('system_prompts')
              .insert({
                ...insertData,
                project_id: projectId
              })
            stats.systemPrompts.imported++
          }
        } catch (error) {
          console.error('Error importing system prompt:', error)
          stats.systemPrompts.errors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
