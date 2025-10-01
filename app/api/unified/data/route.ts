import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

// Types pour table_data
interface TableDataRow {
  id: string
  node_id: string
  row_index: number
  row_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId requis' }, { status: 400 })
    }

    // Récupérer toutes les lignes de données pour ce node depuis table_data
    const { data: tableRows, error } = await supabase
      .from('table_data')
      .select('id, row_data, row_index, created_at, updated_at')
      .eq('node_id', nodeId)
      .order('row_index', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Transformer les données pour le format attendu par le frontend
    const rows = (tableRows as TableDataRow[] || []).map(row => ({
      id: row.id,
      ...row.row_data,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))

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

    // Valider nodeId
    if (!isValidUUID(nodeId)) {
      return NextResponse.json({ error: 'nodeId invalide (doit être UUID)' }, { status: 400 })
    }

    // Obtenir le prochain index
    const { data: existingRows } = await supabase
      .from('table_data')
      .select('row_index')
      .eq('node_id', nodeId)
      .order('row_index', { ascending: false })
      .limit(1)

    const typedExistingRows = existingRows as { row_index: number }[]
    const nextIndex = typedExistingRows.length > 0 ? typedExistingRows[0].row_index + 1 : 0

    // Ajouter nouvelle ligne
    const { data, error } = await supabase
      .from('table_data')
      .insert({
        node_id: nodeId,
        row_index: nextIndex,
        row_data: rowData || {}
      } as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const insertedRow = data as TableDataRow

    return NextResponse.json({ 
      success: true, 
      row: {
        id: insertedRow.id,
        data: insertedRow.row_data
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
    const { rowId, columnId, value, updates } = await request.json()

    if (!rowId) {
      return NextResponse.json({ error: 'rowId requis' }, { status: 400 })
    }

    // Si rowId n'est pas un UUID valide (ID fictif du frontend), traiter comme nouvelle création
    if (!isValidUUID(rowId)) {
      console.log('Fictional rowId detected, creating new row instead of updating')
      // Besoin de nodeId pour création ; assume updates inclut node_id si fourni, sinon error
      const nodeId = updates?.node_id || columnId // Fallback, mais idéalement require nodeId
      if (!nodeId || !isValidUUID(nodeId)) {
        return NextResponse.json({ error: 'nodeId requis pour création avec ID fictif' }, { status: 400 })
      }

      // Obtenir prochain index pour nodeId
      const { data: existingRows } = await supabase
        .from('table_data')
        .select('row_index')
        .eq('node_id', nodeId)
        .order('row_index', { ascending: false })
        .limit(1)

      const typedExistingRows = existingRows as { row_index: number }[]
      const nextIndex = typedExistingRows.length > 0 ? typedExistingRows[0].row_index + 1 : 0

      // Créer nouvelle row avec les updates comme row_data
      const rowData = updates || { [columnId]: value }

      const { data: newRow, error: insertError } = await supabase
        .from('table_data')
        .insert({
          node_id: nodeId,
          row_index: nextIndex,
          row_data: rowData
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      const newRowData = newRow as TableDataRow

      return NextResponse.json({
        success: true,
        row: {
          id: newRowData.id,
          ...newRowData.row_data
        },
        message: 'Nouvelle ligne créée (ID fictif converti)'
      })
    }

    // UUID valide : mise à jour normale
    // Récupérer la ligne actuelle
    const { data: currentRow, error: fetchError } = await supabase
      .from('table_data')
      .select('row_data')
      .eq('id', rowId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    const currentRowData = currentRow as { row_data: Record<string, unknown> }

    let updatedData: Record<string, unknown>

    // Support pour les deux formats : ancienne méthode (columnId + value) ou nouvelle méthode (updates)
    if (updates) {
      // Nouvelle méthode : mettre à jour plusieurs champs à la fois
      updatedData = {
        ...currentRowData.row_data,
        ...updates
      }
    } else if (columnId) {
      // Ancienne méthode : mettre à jour une seule cellule
      updatedData = {
        ...currentRowData.row_data,
        [columnId]: value
      }
    } else {
      return NextResponse.json({ error: 'columnId ou updates requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('table_data')
      .update({
        row_data: updatedData,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', rowId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const updatedRow = data as TableDataRow

    return NextResponse.json({
      success: true,
      row: {
        id: updatedRow.id,
        ...updatedRow.row_data
      },
      message: updates ? 'Ligne mise à jour' : 'Cellule mise à jour'
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

    // Si rowId fictif, ignore delete (pas de row à supprimer)
    if (!isValidUUID(rowId)) {
      return NextResponse.json({ 
        success: true,
        message: 'ID fictif ignoré (aucune suppression)'
      })
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
