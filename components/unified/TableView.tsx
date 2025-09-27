import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Settings } from 'lucide-react'

interface TableColumn {
  id: string
  name: string
  type: 'text' | 'select' | 'number' | 'boolean' | 'date' | 'tags'
  options?: any
  visible: boolean
  order: number
}

interface TableRow {
  id: string
  data: Record<string, any>
}

interface TableViewProps {
  projectId: string
  nodeId: string
  mode: 'memory' | 'rules'
  onDataChange: () => void
}

export function TableView({ projectId, nodeId, mode, onDataChange }: TableViewProps) {
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<{rowId: string, columnId: string} | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadTableData()
  }, [nodeId])

  const loadTableData = async () => {
    setLoading(true)
    try {
      // Charger les colonnes
      const columnsResponse = await fetch(`/api/unified/columns?nodeId=${nodeId}`)
      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json()
        setColumns(columnsData.columns || [])
      }

      // Charger les données
      const dataResponse = await fetch(`/api/unified/data?nodeId=${nodeId}`)
      if (dataResponse.ok) {
        const rowsData = await dataResponse.json()
        setRows(rowsData.rows || [])
      }
    } catch (error) {
      console.error('Erreur chargement tableau:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (rowId: string, columnId: string, currentValue: any) => {
    setEditingCell({ rowId, columnId })
    setEditValue(currentValue || '')
  }

  const saveEdit = async () => {
    if (!editingCell) return

    try {
      const response = await fetch('/api/unified/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: editingCell.rowId,
          columnId: editingCell.columnId,
          value: editValue
        })
      })

      if (response.ok) {
        await loadTableData()
        setEditingCell(null)
        setEditValue('')
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const addRow = async () => {
    try {
      const response = await fetch('/api/unified/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          data: {}
        })
      })

      if (response.ok) {
        await loadTableData()
      }
    } catch (error) {
      console.error('Erreur ajout ligne:', error)
    }
  }

  const deleteRow = async (rowId: string) => {
    if (!confirm('Supprimer cette ligne ?')) return

    try {
      const response = await fetch('/api/unified/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId })
      })

      if (response.ok) {
        await loadTableData()
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const renderCell = (row: TableRow, column: TableColumn) => {
    const value = row.data[column.id] || ''
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id

    if (isEditing) {
      if (column.type === 'select') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            className="w-full p-1 border border-blue-500 rounded text-sm"
            autoFocus
          >
            <option value="">Sélectionner...</option>
            {column.options?.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      }

      if (column.type === 'boolean') {
        return (
          <input
            type="checkbox"
            checked={editValue === 'true' || editValue === true}
            onChange={(e) => {
              setEditValue(e.target.checked.toString())
              setTimeout(saveEdit, 100)
            }}
            className="rounded"
            autoFocus
          />
        )
      }

      return (
        <input
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit()
            if (e.key === 'Escape') cancelEdit()
          }}
          className="w-full p-1 border border-blue-500 rounded text-sm"
          autoFocus
        />
      )
    }

    // Affichage normal
    return (
      <div
        onClick={() => startEdit(row.id, column.id, value)}
        className="p-2 hover:bg-gray-50 cursor-pointer rounded text-sm min-h-[32px] flex items-center"
      >
        {column.type === 'boolean' ? (
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            readOnly
            className="rounded"
          />
        ) : column.type === 'select' ? (
          <span className={`px-2 py-1 rounded text-xs ${
            value ? 'bg-blue-100 text-blue-800' : 'text-gray-500'
          }`}>
            {value || 'Non défini'}
          </span>
        ) : (
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || column.options?.placeholder || 'Cliquer pour éditer'}
          </span>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Chargement...</div>
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">
          {mode === 'rules' ? 'Règles' : 'Contenu'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Ajouter ligne
          </button>
          <button className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {columns.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {columns
                  .filter(col => col.visible)
                  .sort((a, b) => a.order - b.order)
                  .map(column => (
                    <th
                      key={column.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                    >
                      {column.name}
                    </th>
                  ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {columns
                    .filter(col => col.visible)
                    .sort((a, b) => a.order - b.order)
                    .map(column => (
                      <td key={column.id} className="border-b border-gray-200">
                        {renderCell(row, column)}
                      </td>
                    ))}
                  <td className="px-4 py-2 text-right border-b border-gray-200">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune colonne configurée</p>
              <p className="text-sm">Configurez les colonnes pour ce tableau</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {columns.length > 0 && rows.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Plus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune donnée</p>
            <button
              onClick={addRow}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              Ajouter la première ligne
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
