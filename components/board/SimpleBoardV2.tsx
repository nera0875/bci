'use client'

import { useState, useEffect } from 'react'
import { X, Plus, FolderPlus, FilePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import type { Database } from '@/lib/supabase/database.types'

interface SimpleBoardV2Props {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface TreeNode extends MemoryNode {
  children?: TreeNode[]
}

export default function SimpleBoardV2({ projectId, isOpen, onClose }: SimpleBoardV2Props) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [editingContent, setEditingContent] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadNodes()
    }
  }, [isOpen, projectId])

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
      .order('position', { ascending: true })

    if (data && !error) {
      setNodes(data)
      // Auto-expand Memory folder
      const memoryFolder = data.find(n => n.name === 'Memory')
      if (memoryFolder) {
        setExpandedNodes(new Set([memoryFolder.id]))
      }
    }
  }

  const buildTree = (nodes: MemoryNode[]): TreeNode[] => {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    nodes.forEach(node => {
      map.set(node.id, { ...node, children: [] })
    })

    nodes.forEach(node => {
      const treeNode = map.get(node.id)!
      if (node.parent_id) {
        const parent = map.get(node.parent_id)
        if (parent) {
          parent.children!.push(treeNode)
        }
      } else {
        roots.push(treeNode)
      }
    })

    return roots
  }

  const createFolder = async () => {
    const name = prompt('Nom du dossier:')
    if (!name?.trim()) return

    const { error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        name: name.trim(),
        type: 'folder',
        icon: '📁',
        parent_id: selectedNode?.type === 'folder' ? selectedNode.id : null
      })

    if (error) {
      toast.error('Erreur création dossier')
    } else {
      toast.success('Dossier créé')
      loadNodes()
    }
  }

  const createDocument = async () => {
    const name = prompt('Nom du document:')
    if (!name?.trim()) return

    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        name: name.trim(),
        type: 'document',
        icon: '📄',
        content: '',
        parent_id: selectedNode?.type === 'folder' ? selectedNode.id : null
      })
      .select()
      .single()

    if (error) {
      toast.error('Erreur création document')
    } else {
      toast.success('Document créé')
      loadNodes()
      if (data) {
        setSelectedNode(data)
      }
    }
  }

  const deleteNode = async (nodeId: string) => {
    if (!confirm('Supprimer cet élément ?')) return

    const { error } = await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', nodeId)

    if (error) {
      toast.error('Erreur suppression')
    } else {
      toast.success('Élément supprimé')
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
      loadNodes()
    }
  }

  const saveContent = async () => {
    if (!selectedNode || selectedNode.type !== 'document') return

    const { error } = await supabase
      .from('memory_nodes')
      .update({ content: editingContent, updated_at: new Date().toISOString() })
      .eq('id', selectedNode.id)

    if (error) {
      toast.error('Erreur sauvegarde')
    } else {
      toast.success('Sauvegardé')
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

  const renderTree = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleExpand(node.id)
            } else {
              setSelectedNode(node)
            }
          }}
        >
          {node.type === 'folder' && (
            <span className="text-gray-400 text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="text-lg">{node.icon || (node.type === 'folder' ? '📁' : '📄')}</span>
          <span className="text-sm flex-1 truncate">{node.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteNode(node.id)
            }}
            className="opacity-0 hover:opacity-100 text-red-500 hover:text-red-700 text-xs"
          >
            🗑️
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderTree(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const tree = buildTree(nodes)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-7xl mx-4 h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Memory Board</h2>
            <p className="text-sm text-gray-500">Organisation automatique par IA</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">

          {/* SIDEBAR: Tree */}
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            {/* Actions */}
            <div className="p-3 border-b space-y-2">
              <Button onClick={createFolder} size="sm" className="w-full justify-start">
                <FolderPlus className="w-4 h-4 mr-2" />
                Nouveau Dossier
              </Button>
              <Button onClick={createDocument} size="sm" variant="outline" className="w-full justify-start">
                <FilePlus className="w-4 h-4 mr-2" />
                Nouveau Document
              </Button>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-2">
              {tree.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p>Aucun dossier</p>
                  <p className="text-xs mt-2">Crée un dossier pour commencer</p>
                </div>
              ) : (
                tree.map(node => renderTree(node))
              )}
            </div>
          </div>

          {/* CENTER: Simple Textarea Editor */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedNode && selectedNode.type === 'document' ? (
              <>
                <div className="px-6 py-3 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedNode.name}</h3>
                    <p className="text-xs text-gray-500">Markdown supporté</p>
                  </div>
                  <Button onClick={saveContent} size="sm">
                    Sauvegarder
                  </Button>
                </div>
                <div className="flex-1 p-6">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full h-full font-mono text-sm border rounded p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Écrivez votre contenu ici..."
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-lg mb-2">Sélectionne un document pour l'éditer</p>
                  <p className="text-sm">ou crée-en un nouveau</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
