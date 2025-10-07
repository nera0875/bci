import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rule_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ categories: data || [] })
  } catch (error: any) {
    console.error('Error fetching rule categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, key, label, icon, description } = body

    if (!projectId || !key || !label) {
      return NextResponse.json(
        { error: 'projectId, key, and label are required' },
        { status: 400 }
      )
    }

    // Check if category with same key already exists
    const { data: existing } = await supabase
      .from('rule_categories')
      .select('id')
      .eq('project_id', projectId)
      .eq('key', key)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this key already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('rule_categories')
      .insert({
        project_id: projectId,
        key: key.toLowerCase().replace(/\s+/g, '_'),
        label,
        icon: icon || '📁',
        description: description || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category: data })
  } catch (error: any) {
    console.error('Error creating rule category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, key, label, icon, description } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: any = {}
    if (key !== undefined) updates.key = key.toLowerCase().replace(/\s+/g, '_')
    if (label !== undefined) updates.label = label
    if (icon !== undefined) updates.icon = icon
    if (description !== undefined) updates.description = description

    const { data, error } = await supabase
      .from('rule_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category: data })
  } catch (error: any) {
    console.error('Error updating rule category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('rule_categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting rule category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
