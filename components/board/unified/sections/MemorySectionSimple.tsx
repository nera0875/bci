'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Brain, Folder, File, Plus, ChevronRight, ChevronDown,
  Edit2, Trash2, Save, X, Download, Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document'
  icon?: string
  path: string
  content?: string
  children?: TreeNode[]
  parent_id?: string | null
}

interface MemorySectionProps {
  projectId: string
}

// Simple emoji picker
const FOLDER_EMOJIS = ['📁', '📂', '🗂️', '📦', '🔒', '⚡', '🎯', '🔧', '💾', '🌟']
const FILE_EMOJIS = ['📄', '📝', '📋', '📜', '📃', '💡', '🔍', '⚙️', '🎨', '✨']

export default function MemorySection({ projectId }: MemorySectionProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadNodes()
  }, [projectId])

  useEffect(() => {
    if (selectedNode) {
      setEditingContent(selectedNode.content || '')
    }
  }, [selectedNode])

  const loadNodes = async () => {
    const { data, error } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('name')

    if (data && !error) {
      const tree = buildTree(data)
      setNodes(tree)
    }
  }

  const buildTree = (flatNodes: any[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    // Create all nodes
    flatNodes.forEach(node => {
      nodeMap.set(node.id, {
        ...node,
        children: []
      })
    })

    // Build tree structure
    flatNodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(treeNode)
      } else {
        rootNodes.push(treeNode)
      }
    })

    return rootNodes
  }

  const createNode = async (type: 'folder' | 'document', parentId?: string) => {
    const name = type === 'folder' ? 'New Folder' : 'New Document'
    const icon = type === 'folder' ? '📁' : '📄'

    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        name,
        type,
        icon,
        path: `/${name.toLowerCase().replace(' ', '-')}`,
        parent_id: parentId || null,
        content: type === 'document' ? '# New Document\n\nStart typing here...' : null
      })
      .select()
      .single()

    if (!error && data) {
      toast.success(`${type === 'folder' ? 'Folder' : 'Document'} created`)
      loadNodes()
    }
  }

  const updateNode = async (nodeId: string, updates: Partial<TreeNode>) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update(updates)
      .eq('id', nodeId)

    if (!error) {
      toast.success('Updated successfully')
      loadNodes()
    }
  }

  const deleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const { error } = await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', nodeId)

    if (!error) {
      toast.success('Deleted successfully')
      loadNodes()
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    }
  }

  const saveContent = async () => {
    if (!selectedNode) return

    const { error } = await supabase
      .from('memory_nodes')
      .update({ content: editingContent })
      .eq('id', selectedNode.id)

    if (!error) {
      toast.success('Content saved')
      setSelectedNode(prev => prev ? { ...prev, content: editingContent } : null)
    }
  }

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverNode(nodeId)
  }

  const handleDrop = async (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || draggedNode.id === targetNode.id) {
      setDraggedNode(null)
      setDragOverNode(null)
      return
    }

    // Only allow dropping into folders
    if (targetNode.type === 'folder') {
      await updateNode(draggedNode.id, { parent_id: targetNode.id })
    }

    setDraggedNode(null)
    setDragOverNode(null)
  }

  // Tree Item Component
  const TreeItem = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(node.name)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id

    const handleRename = () => {
      if (editName.trim() && editName !== node.name) {
        updateNode(node.id, { name: editName.trim() })
      }
      setIsEditing(false)
    }

    return (
      <div>
        <div
          draggable={!isEditing}
          onDragStart={(e) => !isEditing && handleDragStart(e, node)}
          onDragOver={(e) => node.type === 'folder' && handleDragOver(e, node.id)}
          onDrop={(e) => node.type === 'folder' && handleDrop(e, node)}
          className={cn(
            "group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            isSelected && "bg-blue-50 dark:bg-blue-900/20",
            dragOverNode === node.id && "bg-blue-100 dark:bg-blue-900/30"
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => !isEditing && node.type === 'document' && setSelectedNode(node)}
        >
          {/* Expand/Collapse */}
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newExpanded = new Set(expandedNodes)
                isExpanded ? newExpanded.delete(node.id) : newExpanded.add(node.id)
                setExpandedNodes(newExpanded)
              }}
              className="p-0.5"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}

          {/* Icon */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowEmojiPicker(!showEmojiPicker)
              }}
              className="text-lg hover:scale-110 transition-transform"
            >
              {node.icon || (node.type === 'folder' ? '📁' : '📄')}
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute top-full left-0 z-20 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border">
                <div className="grid grid-cols-5 gap-1">
                  {(node.type === 'folder' ? FOLDER_EMOJIS : FILE_EMOJIS).map(emoji => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation()
                        updateNode(node.id, { icon: emoji })
                        setShowEmojiPicker(false)
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          {isEditing ? (
            <input
              ref={(el) => el?.focus()}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsEditing(false)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0.5 bg-white dark:bg-gray-900 border rounded text-sm"
            />
          ) : (
            <span className="flex-1 text-sm">{node.name}</span>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteNode(node.id)
              }}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="text-blue-600" size={20} />
              <h3 className="font-semibold">Memory Bank</h3>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createNode('folder')}
                className="p-1.5"
              >
                <Folder size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createNode('document')}
                className="p-1.5"
              >
                <File size={16} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border rounded-lg"
          />
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto p-2">
          {nodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No memory nodes yet</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createNode('folder')}
                className="mt-2"
              >
                <Plus size={14} className="mr-1" />
                Create First Folder
              </Button>
            </div>
          ) : (
            nodes
              .filter(node =>
                searchTerm === '' ||
                node.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(node => <TreeItem key={node.id} node={node} />)
          )}
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {selectedNode ? (
          <>
            {/* Editor Header */}
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedNode.icon || '📄'}</span>
                  <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
                </div>
                <Button onClick={saveContent} size="sm">
                  <Save size={14} className="mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-4">
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full h-full p-4 bg-white dark:bg-gray-900 border rounded-lg font-mono text-sm resize-none"
                placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <File size={48} className="mx-auto mb-3 opacity-30" />
              <p>Select a document to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}