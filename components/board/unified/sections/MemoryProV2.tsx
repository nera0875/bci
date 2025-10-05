'use client'

import { useState, useEffect } from 'react'
import {
  Folder, File, Plus, Search, FileText, Shield,
  Database, Globe, Server, Terminal, Code, Bug,
  Key, Lock, AlertTriangle, CheckCircle, Eye,
  Trash2, Edit2, Save, X, FolderPlus, FilePlus,
  GripVertical, ChevronRight, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import MarkdownEditorPro from '@/components/editor/MarkdownEditorPro'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document'
  icon?: string
  color?: string
  content?: any
  parent_id?: string | null
  children?: TreeNode[]
}

interface MemoryProV2Props {
  projectId: string
}

const ICONS: { [key: string]: any } = {
  'folder': Folder,
  'file': File,
  'document': FileText,
  'shield': Shield,
  'bug': Bug,
  'lock': Lock,
  'key': Key,
  'alert': AlertTriangle,
  'success': CheckCircle,
  'database': Database,
  'server': Server,
  'terminal': Terminal,
  'code': Code,
  'eye': Eye,
  'globe': Globe
}

const getIcon = (iconName?: string, type?: string) => {
  if (iconName && ICONS[iconName]) return ICONS[iconName]
  return type === 'folder' ? Folder : FileText
}

export default function MemoryProV2({ projectId }: MemoryProV2Props) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [documentContent, setDocumentContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Drag state
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)
  const [dropTarget, setDropTarget] = useState<{ nodeId: string; position: 'before' | 'after' | 'inside' } | null>(null)

  useEffect(() => {
    loadMemoryStructure()
  }, [projectId])

  useEffect(() => {
    if (!isDirty || !selectedNode || selectedNode.type !== 'document') return

    const timer = setTimeout(() => {
      saveDocumentContent()
    }, 2000)

    return () => clearTimeout(timer)
  }, [documentContent, isDirty])

  const loadMemoryStructure = async () => {
    try {
      const { data: nodes } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('name')

      if (nodes) {
        const nodeMap = new Map<string, TreeNode>()
        const rootNodes: TreeNode[] = []

        nodes.forEach(node => {
          nodeMap.set(node.id, { ...node, children: [] })
        })

        nodes.forEach(node => {
          const treeNode = nodeMap.get(node.id)!
          if (node.parent_id && nodeMap.has(node.parent_id)) {
            const parent = nodeMap.get(node.parent_id)!
            if (!parent.children) parent.children = []
            parent.children.push(treeNode)
          } else {
            rootNodes.push(treeNode)
          }
        })

        setTreeData(rootNodes)

        // Auto-expand all folders initially
        const allFolderIds = nodes.filter(n => n.type === 'folder').map(n => n.id)
        setExpandedFolders(new Set(allFolderIds))
      }
    } catch (error) {
      console.error('Error loading memory:', error)
    }
  }

  const handleNodeSelect = (node: TreeNode) => {
    if (node.type === 'document') {
      setSelectedNode(node)
      setDocumentContent(typeof node.content === 'string' ? node.content : node.content?.text || '')
      setIsDirty(false)
    }
  }

  const saveDocumentContent = async () => {
    if (!selectedNode || selectedNode.type !== 'document') return

    try {
      await supabase
        .from('memory_nodes')
        .update({ content: documentContent })
        .eq('id', selectedNode.id)

      setIsDirty(false)
      toast.success('Saved')

      // Auto-générer embedding pour similarity search
      try {
        await fetch('/api/embeddings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: selectedNode.id,
            content: `${selectedNode.name}\n${documentContent}`
          })
        })
        console.log('🧬 Embedding généré pour', selectedNode.name)
      } catch (err) {
        console.warn('Embedding generation failed:', err)
      }
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save')
    }
  }

  const handleCreateNode = async (type: 'folder' | 'document', parentId?: string) => {
    const name = type === 'folder' ? 'New Folder' : 'New Document'

    try {
      const { data, error } = await supabase
        .from('memory_nodes')
        .insert([{
          name,
          type,
          parent_id: parentId || null,
          project_id: projectId,
          icon: type === 'folder' ? 'folder' : 'document',
          content: type === 'document' ? '' : null
        }])
        .select()
        .single()

      if (error) throw error

      toast.success(`Created ${name}`)
      loadMemoryStructure()

      if (type === 'document' && data) {
        handleNodeSelect(data)
      }
    } catch (error) {
      console.error('Error creating node:', error)
      toast.error('Failed to create item')
    }
  }

  const handleRename = async (nodeId: string, newName: string) => {
    if (!newName.trim()) return

    try {
      await supabase
        .from('memory_nodes')
        .update({ name: newName.trim() })
        .eq('id', nodeId)

      toast.success('Renamed')
      loadMemoryStructure()
      setEditingNodeId(null)
    } catch (error) {
      toast.error('Failed to rename')
    }
  }

  const handleDelete = async (nodeId: string) => {
    if (!confirm('Delete this item and all its children?')) return

    try {
      await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      toast.success('Deleted')
      loadMemoryStructure()

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
        setDocumentContent('')
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Drag & Drop handlers (Notion-style)
  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    e.stopPropagation()
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || draggedNode.id === targetNode.id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let position: 'before' | 'after' | 'inside'

    if (targetNode.type === 'folder') {
      if (y < height * 0.25) {
        position = 'before'
      } else if (y > height * 0.75) {
        position = 'after'
      } else {
        position = 'inside'
      }
    } else {
      position = y < height / 2 ? 'before' : 'after'
    }

    setDropTarget({ nodeId: targetNode.id, position })
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || !dropTarget) return

    const flatNodes = flattenTree(treeData)
    const targetNode = flatNodes.find(n => n.id === dropTarget.nodeId)

    if (!targetNode) return

    // Prevent dropping folder into itself
    if (draggedNode.type === 'folder' && isDescendant(draggedNode, targetNode, flatNodes)) {
      toast.error('Cannot move folder into itself')
      setDraggedNode(null)
      setDropTarget(null)
      return
    }

    let newParentId: string | null = null

    if (dropTarget.position === 'inside') {
      newParentId = targetNode.id
    } else {
      newParentId = targetNode.parent_id || null
    }

    try {
      await supabase
        .from('memory_nodes')
        .update({ parent_id: newParentId })
        .eq('id', draggedNode.id)

      toast.success('Moved')
      loadMemoryStructure()

      // Expand target folder
      if (dropTarget.position === 'inside') {
        setExpandedFolders(prev => new Set(prev).add(targetNode.id))
      }
    } catch (error) {
      toast.error('Failed to move')
    }

    setDraggedNode(null)
    setDropTarget(null)
  }

  const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = []
    const traverse = (items: TreeNode[]) => {
      items.forEach(item => {
        result.push(item)
        if (item.children) traverse(item.children)
      })
    }
    traverse(nodes)
    return result
  }

  const isDescendant = (parent: TreeNode, target: TreeNode, allNodes: TreeNode[]): boolean => {
    if (parent.id === target.id) return true
    const children = allNodes.filter(n => n.parent_id === parent.id)
    return children.some(child => isDescendant(child, target, allNodes))
  }

  const filterNodes = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes

    return nodes.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(query.toLowerCase())
      const childrenMatch = node.children ? filterNodes(node.children, query).length > 0 : false
      return matchesSearch || childrenMatch
    }).map(node => ({
      ...node,
      children: node.children ? filterNodes(node.children, query) : []
    }))
  }

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const Icon = getIcon(node.icon, node.type)
    const isSelected = selectedNode?.id === node.id
    const isEditing = editingNodeId === node.id
    const isExpanded = expandedFolders.has(node.id)
    const hasChildren = node.children && node.children.length > 0
    const isDragging = draggedNode?.id === node.id
    const isDropBefore = dropTarget?.nodeId === node.id && dropTarget.position === 'before'
    const isDropAfter = dropTarget?.nodeId === node.id && dropTarget.position === 'after'
    const isDropInside = dropTarget?.nodeId === node.id && dropTarget.position === 'inside'

    // Increased indent: 24px per level for clearer hierarchy
    const indent = depth * 24

    return (
      <div key={node.id}>
        {/* Drop indicator - Before */}
        {isDropBefore && (
          <div className="h-0.5 bg-blue-500 mx-2 rounded-full" style={{ marginLeft: `${indent + 8}px` }} />
        )}

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-all relative",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            isSelected && "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700",
            isDragging && "opacity-30",
            isDropInside && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400"
          )}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => !isEditing && handleNodeSelect(node)}
        >
          {/* Drag Handle */}
          <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={14} className="text-gray-400" />
          </div>

          {/* Expand/Collapse */}
          {node.type === 'folder' ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(node.id)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            // Spacer for documents to align with folder names
            <div className="w-6 flex-shrink-0" />
          )}

          {/* Icon */}
          <Icon size={16} className="flex-shrink-0" style={{ color: node.color || '#6B7280' }} />

          {/* Name */}
          {isEditing ? (
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(node.id, editingName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(node.id, editingName)
                if (e.key === 'Escape') setEditingNodeId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-0.5 text-sm bg-white dark:bg-gray-900 border rounded"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm font-medium truncate">{node.name}</span>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingNodeId(node.id)
                setEditingName(node.name)
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(node.id)
              }}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
            >
              <Trash2 size={14} className="text-red-500" />
            </button>
          </div>
        </div>

        {/* Drop indicator - After */}
        {isDropAfter && (
          <div className="h-0.5 bg-blue-500 mx-2 rounded-full" style={{ marginLeft: `${indent + 8}px` }} />
        )}

        {/* Children - Increased depth passed recursively */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredData = filterNodes(treeData, searchQuery)

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Memory</h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => handleCreateNode('folder')} className="h-8 w-8 p-0">
                <Plus size={16} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleCreateNode('document')} className="h-8 w-8 p-0">
                <FileText size={16} />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto p-2">
          {filteredData.length > 0 ? (
            filteredData.map(node => renderNode(node))
          ) : (
            <div className="text-center text-gray-400 mt-8 text-sm">
              {searchQuery ? 'No results' : 'No items yet'}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNode ? (
          <>
            <div className="h-14 px-6 bg-white dark:bg-gray-900 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComp = getIcon(selectedNode.icon, selectedNode.type)
                  return <IconComp size={20} style={{ color: selectedNode.color }} />
                })()}
                <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
              </div>
              {isDirty && <span className="text-xs text-gray-500">Unsaved changes...</span>}
            </div>

            <div className="flex-1 overflow-hidden overflow-x-hidden">
              <MarkdownEditorPro
                content={documentContent}
                onChange={(markdown) => {
                  setDocumentContent(markdown)
                  setIsDirty(true)
                }}
                placeholder="Start writing..."
                projectId={projectId}
                showAIImprove={true}
                showPreview={true}
                minHeight="calc(100vh - 200px)"
                improvementContext="Memory document for AI RAG/similarity search."
                onSave={saveDocumentContent}
                onCancel={() => setSelectedNode(null)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Select a document</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
