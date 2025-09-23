'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Folder, FileText, Edit2, Trash2, Save, X, FolderPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import CentralEditor from './CentralEditor'

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface MemorySidebarProps {
  projectId: string
}

const NODE_ICONS = {
  folder: Folder,
  document: FileText
}

export default function MemorySidebar({ projectId }: MemorySidebarProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeType, setNewNodeType] = useState<MemoryNode['type']>('folder')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null)
  const [fullEditNode, setFullEditNode] = useState<MemoryNode | null>(null)
  const [renamingNode, setRenamingNode] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [draggedNode, setDraggedNode] = useState<MemoryNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<string | null>(null)

  useEffect(() => {
    loadNodes()
    const cleanup = subscribeToChanges()

    // Polling fallback pour garantir la synchronisation
    const interval = setInterval(() => {
      loadNodes()
    }, 2000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [projectId, refreshKey])

  const loadNodes = async () => {
    const { data, error } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (data && !error) {
      setNodes(data)
    }
  }

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`memory_${projectId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_nodes',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Memory change detected:', payload)
          loadNodes()
          setRefreshKey(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const createNode = async () => {
    if (!newNodeName.trim()) return

    const { error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        parent_id: creatingInFolder || null,
        name: newNodeName,
        type: newNodeType,
        icon: newNodeType === 'folder' ? '📁' : '📄',
        color: '#6E6E80',
        content: newNodeType === 'document' ? '# ' + newNodeName + '\n\nContent here...' : null
      })

    if (!error) {
      setNewNodeName('')
      setIsCreating(false)
      setCreatingInFolder(null)
      // Force refresh immédiat
      setTimeout(() => loadNodes(), 100)
    }
  }

  const updateNodeContent = async (nodeId: string, content: string) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', nodeId)

    if (!error) {
      setEditingNode(null)
      setEditContent('')
      setTimeout(() => loadNodes(), 100)
    }
  }

  const deleteNode = async (nodeId: string) => {
    if (confirm('Delete this item and all its children?')) {
      const { error } = await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      if (!error) {
        setTimeout(() => loadNodes(), 100)
      }
    }
  }

  const renameNode = async (nodeId: string, newName: string) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', nodeId)

    if (!error) {
      setRenamingNode(null)
      setRenameValue('')
      setTimeout(() => loadNodes(), 100)
    }
  }

  const moveNode = async (nodeId: string, newParentId: string | null) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ parent_id: newParentId, updated_at: new Date().toISOString() })
      .eq('id', nodeId)

    if (!error) {
      setTimeout(() => loadNodes(), 100)
    }
  }

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: MemoryNode, level: number = 0) => {
    const children = nodes.filter(n => n.parent_id === node.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode === node.id
    const isEditing = editingNode === node.id
    const isRenaming = renamingNode === node.id
    const isDragOver = dragOverNode === node.id

    const Icon = NODE_ICONS[node.type] || Folder

    return (
      <div key={node.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-background/50 transition-colors group
            ${isSelected ? 'bg-background border-l-2 border-foreground' : ''}
            ${isDragOver ? 'bg-foreground/10 border-2 border-dashed border-foreground/30' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          draggable
          onDragStart={(e) => {
            setDraggedNode(node)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (draggedNode && node.type === 'folder' && draggedNode.id !== node.id) {
              setDragOverNode(node.id)
            }
          }}
          onDragLeave={() => {
            setDragOverNode(null)
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (draggedNode && node.type === 'folder' && draggedNode.id !== node.id) {
              moveNode(draggedNode.id, node.id)
            }
            setDraggedNode(null)
            setDragOverNode(null)
          }}
          onClick={() => {
            setSelectedNode(node.id)
            if (hasChildren) toggleExpand(node.id)
          }}
          onDoubleClick={() => {
            setFullEditNode(node)
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          <div
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
            style={{ color: node.color || '#6E6E80' }}
          >
            {node.icon ? (
              <span className="text-sm">{node.icon}</span>
            ) : (
              <Icon className="w-4 h-4" />
            )}
          </div>

          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameNode(node.id, renameValue)
                }
                if (e.key === 'Escape') {
                  setRenamingNode(null)
                  setRenameValue('')
                }
              }}
              onBlur={() => {
                renameNode(node.id, renameValue)
              }}
              className="flex-1 px-1 py-0 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm text-foreground truncate flex-1">
              {node.name}
            </span>
          )}


          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCreatingInFolder(node.id)
                  setIsCreating(true)
                  setExpandedNodes(prev => new Set([...prev, node.id]))
                }}
                className="p-1 hover:bg-muted rounded"
                title="Add item in folder"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (node.type === 'folder') {
                  setRenamingNode(node.id)
                  setRenameValue(node.name)
                } else {
                  setFullEditNode(node)
                }
              }}
              className="p-1 hover:bg-muted rounded"
              title={node.type === 'folder' ? 'Rename folder' : 'Edit document'}
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteNode(node.id)
              }}
              className="p-1 hover:bg-muted rounded text-error"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>


        {isExpanded && hasChildren && (
          <div>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}

        {/* Create new item in folder */}
        {isCreating && creatingInFolder === node.id && (
          <div className="p-3 bg-background/50 border-l-2 border-muted" style={{ marginLeft: `${level * 20 + 32}px` }}>
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Item name..."
              className="w-full px-2 py-1 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNode()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setCreatingInFolder(null)
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as MemoryNode['type'])}
                className="flex-1 px-2 py-1 text-sm bg-muted border border-input rounded focus:outline-none"
              >
                <option value="folder">📁 Folder</option>
                <option value="document">📄 Document</option>
              </select>
              <button
                onClick={createNode}
                className="px-3 py-1 text-sm bg-foreground text-background rounded hover:opacity-90"
              >
                Create
              </button>
            </div>
          </div>
        )}

      </div>
    )
  }

  // Build tree structure
  const rootNodes = nodes.filter(n => !n.parent_id)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Memory</h3>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 hover:bg-background rounded-lg transition-colors"
            title="Add new item"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Node */}
        {isCreating && (
          <div className="space-y-2 p-3 bg-background rounded-lg border border-border">
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Name..."
              className="w-full px-3 py-1.5 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNode()
                if (e.key === 'Escape') setIsCreating(false)
              }}
            />
            <div className="flex gap-2">
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as MemoryNode['type'])}
                className="flex-1 px-2 py-1 text-sm bg-muted border border-input rounded focus:outline-none"
              >
                <option value="folder">📁 Folder</option>
                <option value="document">📄 Document</option>
              </select>
              <button
                onClick={createNode}
                className="px-3 py-1 text-sm bg-foreground text-background rounded hover:opacity-90"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nodes Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {rootNodes.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm p-8">
            No memory items yet.
            <br />
            Click + to create folders and documents.
          </div>
        ) : (
          rootNodes.map(node => renderNode(node))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        {nodes.length} items • AI Memory System
      </div>

      {/* Full Memory Editor Modal */}
      {fullEditNode && (
        <CentralEditor
          node={fullEditNode}
          onClose={() => setFullEditNode(null)}
          onSave={() => {
            loadNodes()
            setRefreshKey(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}