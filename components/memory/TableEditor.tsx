'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, X } from 'lucide-react'

interface TableData {
  columns: string[]
  rows: string[][]
}

interface TableEditorProps {
  content: string
  onSave: (content: string) => void
  onCancel: () => void
}

export default function TableEditor({ content, onSave, onCancel }: TableEditorProps) {
  const [tableData, setTableData] = useState<TableData>(() => {
    try {
      const parsed = JSON.parse(content || '{}')
      if (parsed.columns && parsed.rows) {
        return parsed
      }
    } catch {}
    return {
      columns: ['Column 1', 'Column 2', 'Column 3'],
      rows: [['', '', '']]
    }
  })

  const addColumn = () => {
    setTableData(prev => ({
      columns: [...prev.columns, `Column ${prev.columns.length + 1}`],
      rows: prev.rows.map(row => [...row, ''])
    }))
  }

  const removeColumn = (index: number) => {
    setTableData(prev => ({
      columns: prev.columns.filter((_, i) => i !== index),
      rows: prev.rows.map(row => row.filter((_, i) => i !== index))
    }))
  }

  const addRow = () => {
    setTableData(prev => ({
      ...prev,
      rows: [...prev.rows, new Array(prev.columns.length).fill('')]
    }))
  }

  const removeRow = (index: number) => {
    setTableData(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index)
    }))
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setTableData(prev => {
      const newRows = [...prev.rows]
      newRows[rowIndex][colIndex] = value
      return { ...prev, rows: newRows }
    })
  }

  const updateColumnName = (index: number, name: string) => {
    setTableData(prev => {
      const newColumns = [...prev.columns]
      newColumns[index] = name
      return { ...prev, columns: newColumns }
    })
  }

  const handleSave = () => {
    onSave(JSON.stringify(tableData, null, 2))
  }

  return (
    <div className="p-4 bg-background rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {tableData.columns.map((col, i) => (
                <th key={i} className="border border-border p-2 bg-muted">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => updateColumnName(i, e.target.value)}
                      className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
                    />
                    <button
                      onClick={() => removeColumn(i)}
                      className="p-0.5 text-error hover:bg-background rounded"
                      title="Remove column"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="border border-border p-2 bg-muted w-10">
                <button
                  onClick={addColumn}
                  className="p-1 hover:bg-background rounded"
                  title="Add column"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-border p-2">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-foreground rounded px-1"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="border border-border p-2 w-10">
                  <button
                    onClick={() => removeRow(rowIndex)}
                    className="p-0.5 text-error hover:bg-muted rounded"
                    title="Remove row"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={addRow}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted"
        >
          <Plus className="w-3 h-3 inline mr-1" />
          Add Row
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-foreground text-background rounded hover:opacity-90"
          >
            <Save className="w-3 h-3 inline mr-1" />
            Save Table
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted"
          >
            <X className="w-3 h-3 inline mr-1" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}