import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId requis' }, { status: 400 })
    }

    // Récupérer les données pour ce node
    const { data, error } = await supabase
      .from('table_data')
      .select('*')
      .eq('node_id', nodeId)
      .order('row_index', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Formater les données pour le tableau
    const rows = data?.map(item => ({
      id: item.id,
      data: item.row_data || {}
    })) || []

    return NextResponse.json({ 
      success: true, 
      rows
    })
  } catch (error) {
    console.error('Erreur GET data:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nodeId, data: rowData } = await request.json()

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId requis' }, { status: 400 })
    }

    // Obtenir le prochain index
    const { data: existingRows } = await supabase
      .from('table_data')
      .select('row_index')
      .eq('node_id', nodeId)
      .order('row_index', { ascending: false })
      .limit(1)

    const nextIndex = existingRows && existingRows.length > 0 
      ? existingRows[0].row_index + 1 
      : 0

    // Ajouter nouvelle ligne
    const { data, error } = await supabase
      .from('table_data')
      .insert({
        node_id: nodeId,
        row_index: nextIndex,
        row_data: rowData || {}
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      row: {
        id: data.id,
        data: data.row_data
      },
      message: 'Ligne ajoutée'
    })
  } catch (error) {
    console.error('Erreur POST data:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { rowId, columnId, value } = await request.json()

    if (!rowId || !columnId) {
      return NextResponse.json({ error: 'rowId et columnId requis' }, { status: 400 })
    }

    // Récupérer la ligne actuelle
    const { data: currentRow, error: fetchError } = await supabase
      .from('table_data')
      .select('row_data')
      .eq('id', rowId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    // Mettre à jour les données
    const updatedData = {
      ...currentRow.row_data,
      [columnId]: value
    }

    const { data, error } = await supabase
      .from('table_data')
      .update({
        row_data: updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', rowId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      row: {
        id: data.id,
        data: data.row_data
      },
      message: 'Cellule mise à jour'
    })
  } catch (error) {
    console.error('Erreur PUT data:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { rowId } = await request.json()

    if (!rowId) {
      return NextResponse.json({ error: 'rowId requis' }, { status: 400 })
    }

    // Supprimer la ligne
    const { error } = await supabase
      .from('table_data')
      .delete()
      .eq('id', rowId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Ligne supprimée'
    })
  } catch (error) {
    console.error('Erreur DELETE data:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
