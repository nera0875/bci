import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId requis' }, { status: 400 })
    }

    // Récupérer les colonnes pour ce node
    const { data, error } = await supabase
      .from('table_columns')
      .select('*')
      .eq('node_id', nodeId)
      .order('order_index', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      columns: data || []
    })
  } catch (error) {
    console.error('Erreur GET columns:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nodeId, column } = await request.json()

    if (!nodeId || !column) {
      return NextResponse.json({ error: 'nodeId et column requis' }, { status: 400 })
    }

    // Ajouter nouvelle colonne
    const { data, error } = await supabase
      .from('table_columns')
      .insert({
        node_id: nodeId,
        column_name: column.name,
        column_type: column.type,
        column_options: column.options || {},
        visible: column.visible !== false,
        order_index: column.order || 0
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      column: data,
      message: `Colonne "${column.name}" ajoutée`
    })
  } catch (error) {
    console.error('Erreur POST columns:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { columnId, updates } = await request.json()

    if (!columnId) {
      return NextResponse.json({ error: 'columnId requis' }, { status: 400 })
    }

    // Mettre à jour la colonne
    const { data, error } = await supabase
      .from('table_columns')
      .update(updates)
      .eq('id', columnId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      column: data,
      message: 'Colonne mise à jour'
    })
  } catch (error) {
    console.error('Erreur PUT columns:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { columnId } = await request.json()

    if (!columnId) {
      return NextResponse.json({ error: 'columnId requis' }, { status: 400 })
    }

    // Supprimer la colonne
    const { error } = await supabase
      .from('table_columns')
      .delete()
      .eq('id', columnId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Colonne supprimée'
    })
  } catch (error) {
    console.error('Erreur DELETE columns:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
