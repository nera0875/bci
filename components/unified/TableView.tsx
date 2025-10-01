import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Settings, AlertCircle } from 'lucide-react'

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
  data: any[]
  node: any
  suggestions?: any[]
  onUpdateRow: (nodeId: string, rowId: string, updates: any) => void
  onDeleteRow: (rowId: string) => void
}

export function TableView({ projectId, nodeId, mode, onDataChange, data, node, suggestions = [], onUpdateRow, onDeleteRow }: TableViewProps) {
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [rows, setRows] = useState<any[]>(data || [])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingCell, setEditingCell] = useState<{rowId: string, columnId: string} | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    setRows(data || [])
  }, [data])

  // No loadTableData needed, use props

  const startEdit = (rowId: string, columnId: string, currentValue: any) => {
    setEditingCell({ rowId, columnId })
    setEditValue(currentValue || '')
  }

  const saveEdit = async () => {
    if (!editingCell || !projectId) return

    setIsSaving(true)
    const body = {
      rowId: editingCell.rowId,
      columnId: editingCell.columnId,
      value: editValue
    }
    console.log('API called for saveEdit:', { mode, ...body });

    try {
      let response
      if (mode === 'memory') {
        // Use memory/update for memory mode
        response = await fetch('/api/memory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            projectId,
            nodeId,
            data: { [editingCell.columnId]: editValue }
          })
        })
      } else {
        // Use unified/data for general/rules row updates
        response = await fetch('/api/unified/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }

      console.log('API response for saveEdit:', response.status, await response.text());
      if (response.ok) {
        onUpdateRow(nodeId, editingCell.rowId, { [editingCell.columnId]: editValue })
        setEditingCell(null)
        setEditValue('')
        if (onDataChange) onDataChange()
        console.log('Save successful');
      } else {
        console.error('Save failed:', response.status);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const addRow = async () => {
    if (!projectId || !node) return

    try {
      let response
      const body = {
        nodeId: node.id,
        data: {}
      }

      if (mode === 'memory') {
        response = await fetch('/api/memory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId,
            nodeId: node.id,
            data: body.data
          })
        })
      } else {
        response = await fetch('/api/unified/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }

      if (response.ok) {
        const newRow = await response.json()
        onUpdateRow(node.id, newRow.id, newRow) // Trigger parent update
        if (onDataChange) onDataChange()
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
        onDeleteRow(rowId)
        if (onDataChange) onDataChange()
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const renderCell = (row: TableRow, column: TableColumn) => {
    const value = row.data[column.id] || ''
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id

    if (isEditing) {
      const inputClass = "w-full p-1 border border-blue-500 rounded text-sm disabled:opacity-50";
      if (column.type === 'select') {
        return (
          <div className="flex items-center gap-2">
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') cancelEdit()
              }}
              className={inputClass}
              disabled={isSaving}
              autoFocus
            >
              <option value="">Sélectionner...</option>
              {column.options?.options?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {isSaving && <span className="text-blue-500">Sauvegarde...</span>}
          </div>
        )
      }

      if (column.type === 'boolean') {
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editValue === 'true' || editValue === true}
              onChange={(e) => {
                setEditValue(e.target.checked.toString())
                setTimeout(saveEdit, 100)
              }}
              className="rounded"
              disabled={isSaving}
              autoFocus
            />
            {isSaving && <span className="text-blue-500 text-sm">Sauvegarde...</span>}
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <input
            type={column.type === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            className={inputClass}
            disabled={isSaving}
            autoFocus
          />
          {isSaving && <span className="text-blue-500">Sauvegarde...</span>}
        </div>
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

  // Render suggestions if available
  if (suggestions && suggestions.length > 0) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Existing table code... but add suggestions below or beside rows */}
        <div className="p-4">
          <h4 className="font-semibold mb-2">Suggestions pour cette table:</h4>
          <div className="space-y-1">
            {suggestions.map((sug, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                <span>{sug.technique}</span>
                <AlertCircle className={`w-4 h-4 ${sug.confidence > 0.7 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            ))}
          </div>
        </div>
        {/* Then the table */}
        {/* ... existing table JSX ... */}
      </div>
    )
  }

  // Fallback to existing table rendering
  // ... rest of component

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
