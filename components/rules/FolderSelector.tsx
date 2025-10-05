'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MemoryNode {
  id: string
  name: string
  type: 'folder' | 'document'
  parent_id: string | null
  icon?: string
  children?: MemoryNode[]
}

interface FolderSelectorProps {
  projectId: string
  selectedFolders: string[]
  onChange: (folderIds: string[]) => void
  className?: string
}

export function FolderSelector({ projectId, selectedFolders, onChange, className }: FolderSelectorProps) {
  const [tree, setTree] = useState<MemoryNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMemoryTree()
  }, [projectId])

  const loadMemoryTree = async () => {
    try {
      const { data: nodes } = await supabase
        .from('memory_nodes')
        .select('id, name, type, parent_id, icon')
        .eq('project_id', projectId)
        .order('name')

      if (nodes) {
        const buildTree = (parentId: string | null = null): MemoryNode[] => {
          return nodes
            .filter(node => node.parent_id === parentId)
            .map(node => ({
              ...node,
              children: node.type === 'folder' ? buildTree(node.id) : []
            }))
        }

        setTree(buildTree())
      }
    } catch (error) {
      console.error('Error loading memory tree:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const toggleSelection = (folderId: string) => {
    const newSelected = selectedFolders.includes(folderId)
      ? selectedFolders.filter(id => id !== folderId)
      : [...selectedFolders, folderId]
    onChange(newSelected)
  }

  const renderNode = (node: MemoryNode, depth: number = 0) => {
    const isFolder = node.type === 'folder'
    const isExpanded = expandedFolders.has(node.id)
    const isSelected = selectedFolders.includes(node.id)
    const hasChildren = isFolder && node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors',
            isSelected && 'bg-blue-50 dark:bg-blue-900/20'
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {/* Expand/Collapse */}
          {isFolder && hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(node.id)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
          {isFolder && !hasChildren && <div className="w-5" />}

          {/* Checkbox */}
          {isFolder && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(node.id)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}

          {/* Icon */}
          {isFolder ? (
            <Folder size={16} className="text-blue-500" />
          ) : (
            <FileText size={16} className="text-gray-400" />
          )}

          {/* Name */}
          <span className={cn(
            'text-sm flex-1',
            isFolder ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
          )}>
            {node.name}
          </span>
        </div>

        {/* Children */}
        {isFolder && isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        Aucun dossier dans Memory
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg bg-white dark:bg-gray-900 overflow-hidden', className)}>
      <div className="max-h-64 overflow-y-auto p-2">
        {tree.map(node => renderNode(node))}
      </div>

      {selectedFolders.length > 0 && (
        <div className="border-t px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {selectedFolders.length} dossier{selectedFolders.length > 1 ? 's' : ''} sélectionné{selectedFolders.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
