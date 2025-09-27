'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Check, XIcon } from 'lucide-react'

interface SimpleBoardProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function SimpleBoard({ projectId, isOpen, onClose }: SimpleBoardProps) {
  const [activeTab, setActiveTab] = useState<'memory' | 'rules'>('memory')
  const [memoryData, setMemoryData] = useState<any[]>([])
  const [rulesData, setRulesData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, activeTab, projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'memory') {
        const response = await fetch(`/api/memory/nodes?projectId=${projectId}`)
        if (response.ok) {
          const data = await response.json()
          const flattened = flattenNodes(data.nodes || [])
          setMemoryData(flattened)
        } else {
          setMemoryData([])
        }
      } else {
        const response = await fetch(`/api/rules/simple?projectId=${projectId}`)
        if (response.ok) {
          const data = await response.json()
          setRulesData(data.rules || [])
        } else {
          setRulesData([])
        }
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const flattenNodes = (nodes: any[]): any[] => {
    let result: any[] = []
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.name || 'Sans nom',
        type: node.type || 'document',
        content: typeof node.content === 'string' ? node.content : JSON.stringify(node.content || ''),
        created_at: node.created_at ? new Date(node.created_at).toLocaleDateString('fr-FR') : 'Inconnu'
      })
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenNodes(node.children))
      }
    }
    return result
  }

  const startEdit = (rowId: string, field: string, value: any) => {
    const cellKey = `${rowId}-${field}`
    setEditingCell(cellKey)
    setEditValue(value || '')
  }

  const saveEdit = async () => {
    if (!editingCell) return

    const [rowId, field] = editingCell.split('-', 2)

    try {
      if (activeTab === 'memory') {
        const response = await fetch('/api/memory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            nodeId: rowId,
            data: { [field]: editValue }
          })
        })
        
        if (response.ok) {
          setMemoryData(prev => prev.map(row => 
            row.id === rowId ? { ...row, [field]: editValue } : row
          ))
        }
      } else {
        const response = await fetch('/api/rules/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            projectId,
            rule: {
              id: rowId,
              [field]: editValue
            }
          })
        })
        
        if (response.ok) {
          setRulesData(prev => prev.map(row => 
            row.id === rowId ? { ...row, [field]: editValue } : row
          ))
        }
      }
      
      setEditingCell(null)
      setEditValue('')
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
      if (activeTab === 'memory') {
        const response = await fetch('/api/memory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId,
            data: {
              name: 'Nouveau document',
              type: 'document',
              content: 'Contenu...'
            }
          })
        })
        
        if (response.ok) {
          await loadData()
        }
      } else {
        const response = await fetch('/api/rules/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId,
            rule: {
              name: 'Nouvelle règle',
              trigger: '*',
              action: 'Instruction...',
              priority: 1,
              enabled: true
            }
          })
        })
        
        if (response.ok) {
          await loadData()
        }
      }
    } catch (error) {
      console.error('Erreur ajout:', error)
    }
  }

  const deleteRow = async (rowId: string) => {
    if (!confirm('Supprimer cet élément ?')) return

    try {
      if (activeTab === 'memory') {
        const response = await fetch('/api/memory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            nodeId: rowId
          })
        })
        
        if (response.ok) {
          setMemoryData(prev => prev.filter(row => row.id !== rowId))
        }
      } else {
        const response = await fetch('/api/rules/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            rule: { id: rowId }
          })
        })
        
        if (response.ok) {
          setRulesData(prev => prev.filter(row => row.id !== rowId))
        }
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }


  if (!isOpen) return null

  const data = activeTab === 'memory' ? memoryData : rulesData

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl mx-4 h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Board Unifié</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'memory'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Mémoire ({memoryData.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'rules'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔧 Règles ({rulesData.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                {activeTab === 'memory' ? (
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contenu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actif</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {activeTab === 'memory' ? (
                      <>
                        <td className="px-4 py-2">{renderCell(row, 'name')}</td>
                        <td className="px-4 py-2">{renderCell(row, 'type', 'select', ['document', 'folder'])}</td>
                        <td className="px-4 py-2 max-w-md">{renderCell(row, 'content')}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{row.created_at}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => deleteRow(row.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2">{renderCell(row, 'name')}</td>
                        <td className="px-4 py-2">{renderCell(row, 'trigger', 'select', ['*', 'failles', 'requetes', 'tests'])}</td>
                        <td className="px-4 py-2 max-w-md">{renderCell(row, 'action')}</td>
                        <td className="px-4 py-2">{renderCell(row, 'priority', 'select', ['1', '2', '3'])}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${row.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {row.enabled ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => deleteRow(row.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Empty state */}
          {!loading && data.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Plus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Aucune donnée</p>
                <button onClick={addRow} className="mt-2 text-blue-600 hover:text-blue-700 text-sm">
                  Ajouter le premier élément
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  function renderCell(row: any, field: string, type: 'text' | 'select' = 'text', options?: string[]) {
    const value = row[field] || ''
    const cellKey = `${row.id}-${field}`
    const isEditing = editingCell === cellKey

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {type === 'select' && options ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              className="flex-1 p-2 border rounded text-sm"
              autoFocus
            >
              <option value="">Sélectionner...</option>
              {options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : field === 'content' || field === 'action' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  saveEdit()
                }
                if (e.key === 'Escape') cancelEdit()
              }}
              className="flex-1 p-2 border rounded text-sm resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') cancelEdit()
              }}
              className="flex-1 p-2 border rounded text-sm"
              autoFocus
            />
          )}
          <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-100 rounded">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div
        onClick={() => startEdit(row.id, field, value)}
        className="p-2 hover:bg-gray-50 cursor-pointer rounded text-sm min-h-[40px] flex items-center"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {field === 'content' || field === 'action' ? 
            (value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : 'Cliquer pour éditer') :
            value || 'Cliquer pour éditer'
          }
        </span>
      </div>
    )
  }
}
