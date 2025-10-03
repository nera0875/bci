import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET /api/rules - List all rules for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ rules: data })
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    )
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, trigger, action, priority = 1, enabled = true } = body

    if (!projectId || !name || !trigger || !action) {
      return NextResponse.json(
        { error: 'projectId, name, trigger, and action are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('rules')
      .insert({
        project_id: projectId,
        name,
        trigger,
        action,
        priority,
        enabled
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating rule:', error)
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    )
  }
}

// PUT /api/rules - Update a rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, trigger, action, priority, enabled } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (trigger !== undefined) updates.trigger = trigger
    if (action !== undefined) updates.action = action
    if (priority !== undefined) updates.priority = priority
    if (enabled !== undefined) updates.enabled = enabled

    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('Error updating rule:', error)
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    )
  }
}

// DELETE /api/rules - Delete a rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    )
  }
}
