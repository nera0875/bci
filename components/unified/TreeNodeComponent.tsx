'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Edit3, Settings, FileText } from 'lucide-react'

interface TableDataItem {
  id: string
  name: string
  type: string
  content?: string
  instructions?: string
  created_at: string
  targetFolder?: string
  trigger?: string
  action?: string
  priority?: number
  enabled?: boolean
  url?: string
  severity?: string
  impact?: string
  [key: string]: unknown
}

interface SimpleRule {
  id: string
  name: string
  [key: string]: unknown
}

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document' | 'rule'
  section: string
  targetFolder?: string
  children?: TreeNode[]
  data?: TableDataItem[]
  icon?: string
  color?: string
  position?: number
  parent_id?: string | null
  metadata?: {
    rules?: unknown[]
    success_history?: number
    [key: string]: unknown
  }
}

interface TreeNodeComponentProps {
  node: TreeNode
  level: number
  isSelected: boolean
  editingNode: string | null
  editingName: string
  appliedRules?: SimpleRule[]
  onSelect: (node: TreeNode) => void
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void
  onStartEditing: (node: TreeNode) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onSetEditingName: (name: string) => void
  onOpenConfiguration: (node: TreeNode) => void
  editInputRef: React.RefObject<HTMLInputElement>
}

export function TreeNodeComponent({
  node,
  level,
  isSelected,
  editingNode,
  editingName,
  appliedRules,
  onSelect,
  onContextMenu,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onSetEditingName,
  onOpenConfiguration,
  editInputRef
}: TreeNodeComponentProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isEditing = editingNode === node.id

  // Affichage metadata règles
  const ruleCount = node.metadata?.rules?.length || 0
  const successHistory = node.metadata?.success_history || 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all group ${
          isSelected
            ? 'bg-[#202123] text-[#FFFFFF]'
            : 'hover:bg-[#FFFFFF]'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 hover:bg-[#F7F7F8] rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-sm"
          style={{ backgroundColor: node.color ? node.color + '20' : '#F7F7F8' }}
        >
          {node.icon || (node.type === 'folder' ? '📁' : '📄')}
        </div>
        
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editingName}
            onChange={(e) => onSetEditingName(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="flex-1 bg-transparent border-b border-current outline-none"
          />
        ) : (
          <span className="text-sm font-medium flex-1">
            {node.name}
            {ruleCount > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                {ruleCount} règles
              </span>
            )}
            {successHistory > 0 && (
              <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                +{successHistory} succ.
              </span>
            )}
          </span>
        )}
        
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStartEditing(node)
            }}
            className="p-1 hover:bg-[#F7F7F8] rounded"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenConfiguration(node)
            }}
            className="p-1 hover:bg-[#F7F7F8] rounded"
          >
            <Settings className="w-3 h-3" />
          </button>
          {node.type === 'document' || node.type === 'rule' ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Ouvrir modal création/édition règle
                console.log('Ouvrir modal règle pour', node.name)
              }}
              className="p-1 hover:bg-[#F7F7F8] rounded"
              title="Créer/Éditer Règle"
            >
              <FileText className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={false}
              editingNode={editingNode}
              editingName={editingName}
              appliedRules={appliedRules}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onStartEditing={onStartEditing}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onSetEditingName={onSetEditingName}
              onOpenConfiguration={onOpenConfiguration}
              editInputRef={editInputRef}
            />
          ))}
        </div>
      )}
    </div>
  )
}
