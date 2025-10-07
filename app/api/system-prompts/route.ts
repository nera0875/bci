import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET: Load system prompts for a project
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prompts: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create system prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, content, description, category, icon, is_active, sort_order } = body

    if (!projectId || !name || !content) {
      return NextResponse.json(
        { error: 'projectId, name, and content required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('system_prompts')
      .insert({
        project_id: projectId,
        name,
        content,
        description: description || null,
        category: category || null,
        icon: icon || '✨',
        is_active: is_active || false,
        sort_order: sort_order || 0
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update system prompt
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, content, description, category, icon, is_active, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (content !== undefined) updates.content = content
    if (description !== undefined) updates.description = description
    if (category !== undefined) updates.category = category
    if (icon !== undefined) updates.icon = icon
    if (is_active !== undefined) updates.is_active = is_active
    if (sort_order !== undefined) updates.sort_order = sort_order

    const { data, error } = await supabase
      .from('system_prompts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete system prompt
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('system_prompts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
