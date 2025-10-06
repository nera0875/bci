import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const dynamic = 'force-dynamic'

// GET - Récupérer tous les tag templates d'un projet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tag_templates')
      .select('*')
      .eq('project_id', projectId)
      .order('name')

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching tag templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tag templates' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau tag template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, color } = body

    if (!projectId || !name || !color) {
      return NextResponse.json(
        { error: 'projectId, name, and color are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tag_templates')
      .insert({
        project_id: projectId,
        name,
        color
      })
      .select()
      .single()

    if (error) {
      // Conflit si tag existe déjà
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating tag template:', error)
    return NextResponse.json(
      { error: 'Failed to create tag template' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un tag template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tag_templates')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag template:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag template' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un tag template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, color } = body

    if (!id || !name || !color) {
      return NextResponse.json(
        { error: 'id, name, and color are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tag_templates')
      .update({
        name,
        color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating tag template:', error)
    return NextResponse.json(
      { error: 'Failed to update tag template' },
      { status: 500 }
    )
  }
}
