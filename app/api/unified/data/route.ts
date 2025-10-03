import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Récupérer les données d'un node (document)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const nodeId = searchParams.get('nodeId')

    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID required' }, { status: 400 })
    }

    // Récupérer les rows du document
    const { data: rows, error } = await supabase
      .from('table_data')
      .select('*')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ rows: rows || [] })
  } catch (error: any) {
    console.error('Error fetching table data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle row
export async function POST(request: NextRequest) {
  try {
    const { nodeId, data } = await request.json()

    if (!nodeId || !data) {
      return NextResponse.json({ error: 'Node ID and data required' }, { status: 400 })
    }

    const { data: newRow, error } = await supabase
      .from('table_data')
      .insert({
        node_id: nodeId,
        data
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ row: newRow })
  } catch (error: any) {
    console.error('Error creating table row:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create row' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une row existante
export async function PUT(request: NextRequest) {
  try {
    const { rowId, data } = await request.json()

    if (!rowId || !data) {
      return NextResponse.json({ error: 'Row ID and data required' }, { status: 400 })
    }

    const { data: updatedRow, error } = await supabase
      .from('table_data')
      .update({ data })
      .eq('id', rowId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ row: updatedRow })
  } catch (error: any) {
    console.error('Error updating table row:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update row' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une row
export async function DELETE(request: NextRequest) {
  try {
    const { rowId } = await request.json()

    if (!rowId) {
      return NextResponse.json({ error: 'Row ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('table_data')
      .delete()
      .eq('id', rowId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting table row:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete row' },
      { status: 500 }
    )
  }
}
