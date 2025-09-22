'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus, ChevronRight, ChevronDown, Folder, FileText, BarChart3,
  Zap, Target, Activity, Edit2, Trash2, Save, X, FolderPlus,
  FilePlus, MoreVertical, Eye, EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import DynamicWidget from './DynamicWidget'
import { generateUUID } from '@/lib/utils/uuid'

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface MemorySidebarEnhancedProps {
  projectId: string
}

const NODE_ICONS = {
  folder: Folder,
  document: FileText,
  widget: BarChart3,
  pattern: Zap,
  exploit: Target,
  metric: Activity
}

const NODE_COLORS = {
  folder: '#FFB800',
  document: '#6E6E80',
  widget: '#00D9FF',
  pattern: '#FF0000',
  exploit: '#FF00FF',
  metric: '#00FF00'
}

export default function MemorySidebarEnhanced({ projectId }: MemorySidebarEnhancedProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isCreating, setIsCreating] = useState<string | null>(null) // null or parent_id
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeType, setNewNodeType] = useState<MemoryNode['type']>('folder')
  const [contextMenu, setContextMenu] = useState<{ nodeId: string, x: number, y: number } | null>(null)
  const [showContent, setShowContent] = useState(true)
  const editInputRef = useRef<HTMLInputElement>(null)
  const contentEditRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadNodes()
    const unsubscribe = subscribeToChanges()
    return unsubscribe
  }, [projectId])

  useEffect(() => {
    if (editingNode && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingNode])

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
      .channel(`memory_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_nodes',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          loadNodes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const createNode = async (parentId: string | null = null) => {
    if (!newNodeName.trim()) return

    const newNode = {
      id: generateUUID(),
      project_id: projectId,
      name: newNodeName,
      type: newNodeType,
      parent_id: parentId,
      icon: newNodeType === 'folder' ? '📁' : '📄',
      color: NODE_COLORS[newNodeType] || '#6E6E80',
      content: newNodeType === 'document' ? {} : null,
      metadata: {},
      position: nodes.filter(n => n.parent_id === parentId).length
    }

    const { error } = await supabase
      .from('memory_nodes')
      .insert(newNode)

    if (!error) {
      setNewNodeName('')
      setIsCreating(null)
      if (parentId) {
        setExpandedNodes(new Set([...expandedNodes, parentId]))
      }
      loadNodes()
    }
  }

  const updateNode = async (nodeId: string, updates: Partial<MemoryNode>) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update(updates)
      .eq('id', nodeId)

    if (!error) {
      loadNodes()
    }
  }

  const deleteNode = async (nodeId: string) => {
    // Delete all children first
    const children = nodes.filter(n => n.parent_id === nodeId)
    for (const child of children) {
      await deleteNode(child.id)
    }

    const { error } = await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', nodeId)

    if (!error) {
      loadNodes()
      setContextMenu(null)
    }
  }

  const saveNodeContent = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    let content = {}
    try {
      content = JSON.parse(editContent)
    } catch {
      content = { text: editContent }
    }

    await updateNode(nodeId, { content })
    setEditingNode(null)
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

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    setContextMenu({ nodeId, x: e.clientX, y: e.clientY })
  }

  const renderContextMenu = () => {
    if (!contextMenu) return null

    const node = nodes.find(n => n.id === contextMenu.nodeId)
    if (!node) return null

    return (
      <div
        className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseLeave={() => setContextMenu(null)}
      >
        {node.type === 'folder' && (
          <>
            <button
              onClick={() => {
                setIsCreating(node.id)
                setNewNodeType('folder')
                setContextMenu(null)
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" /> New Folder
            </button>
            <button
              onClick={() => {
                setIsCreating(node.id)
                setNewNodeType('document')
                setContextMenu(null)
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            >
              <FilePlus className="w-4 h-4" /> New Document
            </button>
            <div className="border-t border-border my-1" />
          </>
        )}

        <button
          onClick={() => {
            setEditingNode(node.id)
            setEditContent(typeof node.content === 'object' ? JSON.stringify(node.content, null, 2) : '')
            setContextMenu(null)
          }}
          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" /> Edit
        </button>

        <button
          onClick={() => {
            if (confirm(`Delete "${node.name}" and all its contents?`)) {
              deleteNode(node.id)
            }
          }}
          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-500"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    )
  }

  const renderNode = (node: MemoryNode, level: number = 0) => {
    const children = nodes.filter(n => n.parent_id === node.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode === node.id
    const isEditing = editingNode === node.id

    const Icon = NODE_ICONS[node.type] || Folder

    return (
      <div key={node.id}>
        <div
          className={`
            group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-all
            ${isSelected ? 'bg-muted border-l-2 border-primary' : ''}
            ${isEditing ? 'bg-muted' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => {
            setSelectedNode(node.id)
            if (node.type === 'folder' && hasChildren) {
              toggleExpand(node.id)
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
        >
          {/* Expand/Collapse */}
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="p-0.5 opacity-60 hover:opacity-100"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Icon */}
          <div
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
            style={{ color: node.color || NODE_COLORS[node.type] }}
          >
            {node.icon ? (
              <span className="text-sm">{node.icon}</span>
            ) : (
              <Icon className="w-4 h-4" />
            )}
          </div>

          {/* Name */}
          <span className="text-sm truncate flex-1 select-none">
            {node.name}
          </span>

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            {node.type === 'document' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingNode(node.id)
                  setEditContent(
                    node.content
                      ? (typeof node.content === 'object'
                        ? JSON.stringify(node.content, null, 2)
                        : node.content)
                      : ''
                  )
                }}
                className="p-1 hover:bg-background rounded"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleContextMenu(e, node.id)
              }}
              className="p-1 hover:bg-background rounded"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>

          {/* Metric Value */}
          {node.type === 'metric' && node.metadata && (node.metadata as any).value && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-background rounded">
              {(node.metadata as any).value}%
            </span>
          )}
        </div>

        {/* Edit Content Panel */}
        {isEditing && node.type === 'document' && (
          <div className="p-3 bg-background border-l-2 border-primary ml-6">
            <textarea
              ref={contentEditRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[200px] p-3 bg-muted border border-input rounded-lg
                         text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter content (text or JSON)..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => saveNodeContent(node.id)}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg
                           text-sm hover:opacity-90 flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => setEditingNode(null)}
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg
                           text-sm flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Create New Child */}
        {isCreating === node.id && (
          <div
            className="p-2 bg-muted/50 border-l-2 border-dashed border-muted-foreground"
            style={{ marginLeft: `${level * 20 + 32}px` }}
          >
            <div className="flex gap-2 items-center">
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as MemoryNode['type'])}
                className="px-2 py-1 text-sm bg-background border border-input rounded"
              >
                <option value="folder">📁 Folder</option>
                <option value="document">📄 Document</option>
              </select>
              <input
                ref={editInputRef}
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Name..."
                className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded
                           focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createNode(node.id)
                  if (e.key === 'Escape') {
                    setIsCreating(null)
                    setNewNodeName('')
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => createNode(node.id)}
                className="p-1 hover:bg-background rounded"
              >
                <Save className="w-4 h-4 text-green-500" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(null)
                  setNewNodeName('')
                }}
                className="p-1 hover:bg-background rounded"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}

        {/* Widget Content */}
        {isExpanded && node.type === 'widget' && node.content && showContent && (
          <div className="px-4 py-2" style={{ paddingLeft: `${level * 20 + 24}px` }}>
            <DynamicWidget content={node.content} />
          </div>
        )}
      </div>
    )
  }

  const rootNodes = nodes.filter(n => !n.parent_id)

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Memory System</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowContent(!showContent)}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title={showContent ? "Hide content" : "Show content"}
            >
              {showContent ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsCreating('root')
                setNewNodeType('folder')
              }}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title="Add root folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsCreating('root')
                setNewNodeType('document')
              }}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title="Add root document"
            >
              <FilePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Create Root Node */}
        {isCreating === 'root' && (
          <div className="flex gap-2 items-center p-2 bg-muted rounded">
            <select
              value={newNodeType}
              onChange={(e) => setNewNodeType(e.target.value as MemoryNode['type'])}
              className="px-2 py-1 text-sm bg-background border border-input rounded"
            >
              <option value="folder">📁 Folder</option>
              <option value="document">📄 Document</option>
              <option value="widget">📊 Widget</option>
              <option value="pattern">⚡ Pattern</option>
            </select>
            <input
              ref={editInputRef}
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Name..."
              className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded
                         focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNode(null)
                if (e.key === 'Escape') {
                  setIsCreating(null)
                  setNewNodeName('')
                }
              }}
              autoFocus
            />
            <button
              onClick={() => createNode(null)}
              className="p-1 hover:bg-background rounded"
            >
              <Save className="w-4 h-4 text-green-500" />
            </button>
            <button
              onClick={() => {
                setIsCreating(null)
                setNewNodeName('')
              }}
              className="p-1 hover:bg-background rounded"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto py-2">
        {rootNodes.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs p-6">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
            No memory nodes yet.
            <br />
            Click the buttons above to create folders and documents.
          </div>
        ) : (
          rootNodes.map(node => renderNode(node))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-between">
        <span>{nodes.length} items</span>
        <span>AI-Modifiable</span>
      </div>

      {/* Context Menu */}
      {renderContextMenu()}
    </div>
  )
}