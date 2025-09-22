'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Folder, FileText, BarChart3, Zap, Target, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import DynamicWidget from './DynamicWidget'

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface MemorySidebarProps {
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

export default function MemorySidebar({ projectId }: MemorySidebarProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeType, setNewNodeType] = useState<MemoryNode['type']>('folder')

  useEffect(() => {
    loadNodes()
    subscribeToChanges()
  }, [projectId])

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

  const createNode = async () => {
    if (!newNodeName.trim()) return

    const { error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        name: newNodeName,
        type: newNodeType,
        icon: newNodeType === 'folder' ? '📁' : '📄',
        color: newNodeType === 'pattern' ? '#FF0000' : '#6E6E80'
      })

    if (!error) {
      setNewNodeName('')
      setIsCreating(false)
      loadNodes()
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

    const Icon = NODE_ICONS[node.type] || Folder

    return (
      <div key={node.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-background/50 transition-colors
            ${isSelected ? 'bg-background border-l-2 border-foreground' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => {
            setSelectedNode(node.id)
            if (hasChildren) toggleExpand(node.id)
          }}
        >
          {hasChildren && (
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
          )}

          <div
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
            style={{ color: node.color }}
          >
            {node.icon ? (
              <span className="text-sm">{node.icon}</span>
            ) : (
              <Icon className="w-4 h-4" />
            )}
          </div>

          <span className="text-sm text-foreground truncate flex-1">
            {node.name}
          </span>

          {node.type === 'metric' && node.metadata && (node.metadata as any).value && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-background rounded">
              {(node.metadata as any).value}%
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}

        {isExpanded && node.type === 'widget' && node.content && (
          <div className="px-4 py-2" style={{ paddingLeft: `${level * 20 + 24}px` }}>
            <DynamicWidget content={node.content} />
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
                <option value="pattern">⚡ Pattern</option>
                <option value="exploit">🎯 Exploit</option>
                <option value="widget">📊 Widget</option>
                <option value="metric">📈 Metric</option>
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
        {nodes.length} items • Claude can modify
      </div>
    </div>
  )
}