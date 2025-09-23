'use client'

import { useState, useEffect } from 'react'
import { X, Save, FileText, Folder, Settings, Hash, Type, Palette } from 'lucide-react'
import { Database } from '@/lib/supabase/database.types'
import { supabase } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading editor...</div>
      </div>
    )
  }
)

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface CentralEditorProps {
  node: MemoryNode
  onClose: () => void
  onSave: (updatedNode: Partial<MemoryNode>) => void
}

export default function CentralEditor({ node, onClose, onSave }: CentralEditorProps) {
  const [editedNode, setEditedNode] = useState<MemoryNode>(node)
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('memory_nodes')
        .update({
          name: editedNode.name,
          content: editedNode.content,
          icon: editedNode.icon,
          color: editedNode.color,
          metadata: editedNode.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', node.id)

      if (!error) {
        onSave(editedNode)
        onClose()
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const Icon = node.type === 'folder' ? Folder : FileText

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[90vw] max-w-5xl h-[85vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted" style={{ color: editedNode.color }}>
              {editedNode.icon || <Icon className="w-5 h-5" />}
            </div>
            <div>
              <input
                type="text"
                value={editedNode.name}
                onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-2 focus:ring-foreground/20 rounded px-2 -mx-2"
              />
              <div className="text-xs text-muted-foreground mt-0.5">
                {node.type === 'folder' ? 'Folder' : 'Document'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        {node.type === 'document' && (
          <div className="flex gap-1 px-4 pt-2 border-b border-border">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'content'
                  ? 'bg-background border-t border-x border-border -mb-px'
                  : 'hover:bg-muted/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Content
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-background border-t border-x border-border -mb-px'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {node.type === 'folder' || activeTab === 'settings' ? (
            /* Settings Panel */
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={editedNode.name}
                  onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Icon
                  </label>
                  <input
                    type="text"
                    value={editedNode.icon || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, icon: e.target.value })}
                    placeholder="📁 or 📄"
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color
                  </label>
                  <input
                    type="color"
                    value={editedNode.color || '#6E6E80'}
                    onChange={(e) => setEditedNode({ ...editedNode, color: e.target.value })}
                    className="w-full h-10 px-2 bg-muted border border-input rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="px-3 py-2 bg-muted/50 border border-input rounded-lg text-muted-foreground">
                  {node.type === 'folder' ? '📁 Folder' : '📄 Document'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Created</label>
                <div className="px-3 py-2 bg-muted/50 border border-input rounded-lg text-muted-foreground text-sm">
                  {new Date(node.created_at).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Last Modified</label>
                <div className="px-3 py-2 bg-muted/50 border border-input rounded-lg text-muted-foreground text-sm">
                  {new Date(node.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            /* Monaco Editor for Content */
            <MonacoEditor
              value={editedNode.content || ''}
              onChange={(value) => setEditedNode({ ...editedNode, content: value || '' })}
              language="markdown"
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
                suggest: {
                  showWords: true,
                  showSnippets: true
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {node.type === 'document' && editedNode.content
              ? `${editedNode.content.length} characters`
              : node.type === 'folder'
              ? 'Folder settings'
              : 'Empty document'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}