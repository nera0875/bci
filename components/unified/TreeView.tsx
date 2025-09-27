import React from 'react'
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Shield } from 'lucide-react'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document' | 'rule'
  view_mode?: 'tree' | 'table'
  children?: TreeNode[]
  parent_id?: string
}

interface TreeViewProps {
  data: TreeNode[]
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string) => void
  onNodeCreate: (parentId: string | null, nodeData: any) => void
  activeTab: string
}

export function TreeView({ data, selectedNodeId, onNodeSelect, onNodeCreate, activeTab }: TreeViewProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getNodeIcon = (node: TreeNode) => {
    if (node.type === 'folder') {
      if (node.view_mode === 'table') {
        return <Shield className="w-4 h-4 text-blue-600" />
      }
      return <Folder className="w-4 h-4 text-gray-600" />
    }
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  const getFilteredNodes = (nodes: TreeNode[]): TreeNode[] => {
    // Filtrer selon l'onglet actif
    if (activeTab === 'rules') {
      return nodes.filter(node => 
        node.type === 'folder' && node.view_mode === 'table' ||
        node.type === 'rule'
      )
    }
    return nodes
  }

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const filteredChildren = hasChildren ? getFilteredNodes(node.children!) : []

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-blue-100 text-blue-900' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onNodeSelect(node.id)}
        >
          {hasChildren && filteredChildren.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(node.id)
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          {getNodeIcon(node)}
          
          <span className="flex-1 text-sm font-medium truncate">
            {node.name}
          </span>

          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNodeCreate(node.id, {
                  name: activeTab === 'rules' ? 'Nouvelle règle' : 'Nouveau document',
                  type: activeTab === 'rules' ? 'rule' : 'document',
                  view_mode: node.view_mode
                })
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {hasChildren && isExpanded && filteredChildren.length > 0 && (
          <div>
            {filteredChildren.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const buildTree = (nodes: TreeNode[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    // Créer la map des nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    // Construire l'arbre
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

    return rootNodes
  }

  const tree = buildTree(data)
  const filteredTree = getFilteredNodes(tree)

  return (
    <div className="space-y-1">
      {filteredTree.map(node => renderNode(node))}
      
      {filteredTree.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aucun dossier</p>
          <button
            onClick={() => onNodeCreate(null, {
              name: activeTab === 'rules' ? 'Règles Pentesting' : 'Nouveau dossier',
              type: 'folder',
              view_mode: 'table'
            })}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Créer le premier dossier
          </button>
        </div>
      )}
    </div>
  )
}
