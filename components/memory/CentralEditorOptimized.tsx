'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  X, Save, FileText, Folder, Settings, Hash, Type, Palette, 
  Maximize2, Minimize2, Copy, Download, Upload, Eye, EyeOff,
  Bold, Italic, List, Link, Code, Quote, Heading1, Heading2,
  Undo, Redo, Search, Replace, ZoomIn, ZoomOut, Moon, Sun
} from 'lucide-react'
import { Database } from '@/lib/supabase/database.types'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground flex items-center gap-2"
        >
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
          Chargement de l'éditeur...
        </motion.div>
      </div>
    )
  }
)

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface CentralEditorOptimizedProps {
  node: MemoryNode
  onClose: () => void
  onSave: (updatedNode: Partial<MemoryNode>) => void
}

export default function CentralEditorOptimized({ node, onClose, onSave }: CentralEditorOptimizedProps) {
  const [editedNode, setEditedNode] = useState<MemoryNode>(node)
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'preview'>('content')
  const [isSaving, setIsSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [showToolbar, setShowToolbar] = useState(true)
  const [wordCount, setWordCount] = useState(0)
  const [lineCount, setLineCount] = useState(0)
  const editorRef = useRef<any>(null)

  useEffect(() => {
    if (editedNode.content && typeof editedNode.content === 'string') {
      setWordCount(editedNode.content.split(/\s+/).filter((word: string) => word.length > 0).length)
      setLineCount(editedNode.content.split('\n').length)
    }
  }, [editedNode.content])

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
        // Animation de succès
        const saveButton = document.querySelector('[data-save-button]')
        if (saveButton) {
          saveButton.classList.add('animate-pulse')
          setTimeout(() => saveButton.classList.remove('animate-pulse'), 1000)
        }
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const insertMarkdown = (syntax: string, placeholder = '') => {
    if (editorRef.current) {
      const editor = editorRef.current
      const selection = editor.getSelection()
      const selectedText = editor.getModel().getValueInRange(selection)
      const textToInsert = selectedText || placeholder
      
      editor.executeEdits('', [{
        range: selection,
        text: `${syntax}${textToInsert}${syntax}`,
        forceMoveMarkers: true
      }])
      
      editor.focus()
    }
  }

  const copyToClipboard = async () => {
    if (editedNode.content && typeof editedNode.content === 'string') {
      await navigator.clipboard.writeText(editedNode.content)
      // Animation de feedback
      const copyButton = document.querySelector('[data-copy-button]')
      if (copyButton) {
        copyButton.classList.add('animate-bounce')
        setTimeout(() => copyButton.classList.remove('animate-bounce'), 500)
      }
    }
  }

  const exportContent = () => {
    if (editedNode.content && typeof editedNode.content === 'string') {
      const blob = new Blob([editedNode.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${editedNode.name}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const Icon = node.type === 'folder' ? Folder : FileText

  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-50 bg-background"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"

  const modalClasses = isFullscreen
    ? "w-full h-full bg-background flex flex-col"
    : "w-[95vw] max-w-6xl h-[90vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col"

  const renderMarkdownPreview = () => {
    const content = typeof editedNode.content === 'string' ? editedNode.content : ''
    return (
      <div className="p-6 prose prose-slate dark:prose-invert max-w-none overflow-y-auto h-full">
        <div dangerouslySetInnerHTML={{ 
          __html: content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/`(.*)`/gim, '<code>$1</code>')
            .replace(/\n/gim, '<br>')
        }} />
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={containerClasses}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={modalClasses}
        >
          {/* Header Enhanced */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-background to-muted/20">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg" 
                style={{ color: 'white' }}
              >
                {editedNode.icon || <Icon className="w-6 h-6" />}
              </motion.div>
              <div className="flex-1">
                <input
                  type="text"
                  value={editedNode.name}
                  onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
                  className="text-xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/30 rounded-lg px-3 py-1 -mx-3 transition-all duration-200"
                  placeholder="Nom du document..."
                />
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    {node.type === 'folder' ? '📁 Dossier' : '📄 Document'}
                  </span>
                  {editedNode.content && typeof editedNode.content === 'string' && (
                    <>
                      <span>{wordCount} mots</span>
                      <span>{lineCount} lignes</span>
                      <span>{editedNode.content.length} caractères</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title={isFullscreen ? "Mode fenêtre" : "Plein écran"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Enhanced Tab Bar */}
          {node.type === 'document' && (
            <div className="flex items-center justify-between px-4 pt-2 border-b border-border bg-muted/10">
              <div className="flex gap-1">
                {[
                  { id: 'content', icon: FileText, label: 'Contenu' },
                  { id: 'preview', icon: Eye, label: 'Aperçu' },
                  { id: 'settings', icon: Settings, label: 'Paramètres' }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-background border-t-2 border-blue-500 text-blue-600 shadow-sm'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </motion.button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowToolbar(!showToolbar)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-sm"
                  title="Basculer la barre d'outils"
                >
                  {showToolbar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          )}

          {/* Enhanced Toolbar */}
          <AnimatePresence>
            {showToolbar && activeTab === 'content' && node.type === 'document' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/5 overflow-x-auto"
              >
                <div className="flex items-center gap-1 mr-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => insertMarkdown('**', 'texte en gras')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Gras"
                  >
                    <Bold className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => insertMarkdown('*', 'texte en italique')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Italique"
                  >
                    <Italic className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => insertMarkdown('`', 'code')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Code"
                  >
                    <Code className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-1 mr-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => insertMarkdown('# ', 'Titre 1')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Titre 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => insertMarkdown('## ', 'Titre 2')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Titre 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => insertMarkdown('- ', 'élément de liste')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Liste"
                  >
                    <List className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={copyToClipboard}
                    data-copy-button
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={exportContent}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Exporter"
                  >
                    <Download className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Diminuer la taille"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </motion.button>
                  <span className="text-xs text-muted-foreground min-w-[2rem] text-center">
                    {fontSize}px
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Augmenter la taille"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={isDarkMode ? "Mode clair" : "Mode sombre"}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {node.type === 'folder' || activeTab === 'settings' ? (
              /* Enhanced Settings Panel */
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 space-y-6 overflow-y-auto h-full bg-gradient-to-br from-background to-muted/10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="space-y-4 p-4 rounded-xl border border-border bg-background/50 backdrop-blur-sm"
                  >
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Type className="w-5 h-5 text-blue-500" />
                      Informations générales
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom</label>
                      <input
                        type="text"
                        value={editedNode.name}
                        onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                        placeholder="Nom du document..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <div className="px-4 py-3 bg-muted/30 border border-input rounded-xl text-muted-foreground flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {node.type === 'folder' ? 'Dossier' : 'Document'}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="space-y-4 p-4 rounded-xl border border-border bg-background/50 backdrop-blur-sm"
                  >
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Palette className="w-5 h-5 text-purple-500" />
                      Apparence
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Icône
                      </label>
                      <input
                        type="text"
                        value={editedNode.icon || ''}
                        onChange={(e) => setEditedNode({ ...editedNode, icon: e.target.value })}
                        placeholder="📁 ou 📄 ou tout emoji"
                        className="w-full px-4 py-3 bg-muted/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Couleur
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={editedNode.color || '#6E6E80'}
                          onChange={(e) => setEditedNode({ ...editedNode, color: e.target.value })}
                          className="w-16 h-12 rounded-xl border border-input cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editedNode.color || '#6E6E80'}
                          onChange={(e) => setEditedNode({ ...editedNode, color: e.target.value })}
                          className="flex-1 px-4 py-3 bg-muted/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all duration-200"
                          placeholder="#6E6E80"
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-xl border border-border bg-background/50 backdrop-blur-sm"
                >
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-500" />
                    Métadonnées
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-muted-foreground mb-1">Créé le</div>
                      <div className="font-medium">{new Date(node.created_at).toLocaleString('fr-FR')}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-muted-foreground mb-1">Modifié le</div>
                      <div className="font-medium">{new Date(node.updated_at).toLocaleString('fr-FR')}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-muted-foreground mb-1">ID</div>
                      <div className="font-mono text-xs">{node.id}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-muted-foreground mb-1">Projet</div>
                      <div className="font-mono text-xs">{node.project_id}</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : activeTab === 'preview' ? (
              /* Enhanced Preview */
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
              >
                {renderMarkdownPreview()}
              </motion.div>
            ) : (
              /* Enhanced Monaco Editor */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full"
              >
                <MonacoEditor
                  value={typeof editedNode.content === 'string' ? editedNode.content : ''}
                  onChange={(value) => setEditedNode({ ...editedNode, content: value || '' })}
                  onMount={(editor) => { editorRef.current = editor }}
                  language="markdown"
                  theme={isDarkMode ? "vs-dark" : "light"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: fontSize,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    padding: { top: 20, bottom: 20 },
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    suggest: {
                      showWords: true,
                      showSnippets: true
                    },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    fontLigatures: true,
                    renderLineHighlight: 'gutter',
                    selectOnLineNumbers: true,
                    roundedSelection: false,
                    readOnly: false,
                    cursorStyle: 'line',
                    mouseWheelZoom: true,
                    quickSuggestions: {
                      other: true,
                      comments: true,
                      strings: true
                    }
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* Enhanced Footer */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 border-t border-border bg-gradient-to-r from-background to-muted/10"
          >
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {node.type === 'document' && editedNode.content && typeof editedNode.content === 'string' ? (
                <>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {editedNode.content.length} caractères
                  </span>
                  <span>{wordCount} mots</span>
                  <span>{lineCount} lignes</span>
                </>
              ) : node.type === 'folder' ? (
                <span className="flex items-center gap-1">
                  <Folder className="w-4 h-4" />
                  Configuration du dossier
                </span>
              ) : (
                <span>Document vide</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-all duration-200"
              >
                Annuler
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSaving}
                data-save-button
                className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
