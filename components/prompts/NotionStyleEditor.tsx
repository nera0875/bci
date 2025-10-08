'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Palette, Highlighter,
  Type, ChevronDown, Sparkles, RefreshCw, Settings2, Save, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NotionStyleEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  projectId?: string
  showAIImprove?: boolean
  onSave?: () => void
  onCancel?: () => void
}

const COLORS = [
  { name: 'Default', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' }
]

const HIGHLIGHTS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#FEF08A' },
  { name: 'Green', value: '#BBF7D0' },
  { name: 'Blue', value: '#BFDBFE' },
  { name: 'Purple', value: '#E9D5FF' },
  { name: 'Pink', value: '#FBCFE8' },
  { name: 'Gray', value: '#E5E7EB' }
]

export default function NotionStyleEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  projectId,
  showAIImprove = false,
  onSave,
  onCancel
}: NotionStyleEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [improving, setImproving] = useState(false)
  const [showImprovementPrompt, setShowImprovementPrompt] = useState(false)
  const [improvementPrompt, setImprovementPrompt] = useState(`Améliore ce prompt système :

{PROMPT}

Objectifs :
- Structure claire (sections, listes)
- Instructions précises
- Exemples concrets si pertinent
- Format Markdown

Renvoie UNIQUEMENT le prompt amélioré.`)

  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      Typography,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3'
      }
    }
  })

  if (!editor) return null

  const handleImprove = async () => {
    console.log('🔧 handleImprove called, projectId:', projectId)

    if (!projectId) {
      toast.error('Project ID required for AI improvement')
      return
    }

    setImproving(true)

    // Show loading toast
    const loadingToast = toast.loading('L\'IA améliore ton prompt...')

    // Create AbortController with 60s timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000) // 60 seconds

    try {
      // Load API key and model from Supabase
      console.log('🔑 Loading project settings from Supabase...')

      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (!projectRes.ok) {
        throw new Error('Failed to load project settings')
      }

      const project = await projectRes.json()
      console.log('📦 Project loaded:', project)

      const apiKeys = project.api_keys || {}
      const aiModel = project.settings?.aiModel || 'claude-sonnet-4-5-20250929'

      console.log('🤖 Model:', aiModel)
      console.log('🔐 Has Anthropic key:', !!apiKeys.anthropic)

      if (!apiKeys.anthropic) {
        toast.dismiss(loadingToast)
        toast.error('Clé API Anthropic manquante dans Settings')
        setImproving(false)
        clearTimeout(timeout)
        return
      }

      const currentContent = editor.getText() // Get plain text instead of HTML
      const finalPrompt = improvementPrompt.replace('{PROMPT}', currentContent)

      console.log('📝 Prompt length:', finalPrompt.length)
      console.log('🚀 Calling /api/chat/improve...')

      // Use lightweight /api/chat/improve endpoint (no context loading)
      const response = await fetch('/api/chat/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          apiKey: apiKeys.anthropic,
          model: aiModel
        }),
        signal: controller.signal
      })

      console.log('✅ Response received:', response.status, response.ok)
      clearTimeout(timeout) // Clear timeout if request succeeds

      if (!response.ok) {
        toast.dismiss(loadingToast)
        throw new Error('Failed to improve')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let improvedContent = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                improvedContent += data.content
                // Update editor in real-time - convert markdown to HTML
                const htmlContent = improvedContent
                  .replace(/\n/g, '<br>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/`(.+?)`/g, '<code>$1</code>')
                  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                  .replace(/^## (.+)$/gm, '<h2>$2</h2>')
                  .replace(/^### (.+)$/gm, '<h3>$1</h3>')

                editor.commands.setContent(htmlContent)
                onChange(htmlContent)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      clearTimeout(timeout) // Clear timeout on success
      toast.dismiss(loadingToast)
      toast.success('Prompt amélioré !')
    } catch (error) {
      clearTimeout(timeout) // Clear timeout on error
      toast.dismiss(loadingToast)

      // Check if it's an abort error (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Timeout : l\'amélioration prend trop de temps (>60s)')
      } else {
        toast.error('Erreur lors de l\'amélioration')
      }
      console.error(error)
    }
    setImproving(false)
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    icon: Icon,
    label
  }: {
    onClick: () => void
    isActive?: boolean
    icon: any
    label: string
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
        isActive && "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
      )}
      title={label}
    >
      <Icon size={18} />
    </button>
  )

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1 flex-wrap bg-gray-50 dark:bg-gray-800">
        {/* Text Formatting */}
        <div className="flex items-center gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            label="Bold (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            label="Italic (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            icon={Strikethrough}
            label="Strikethrough"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            icon={Code}
            label="Inline Code"
          />
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            label="Heading 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            label="Heading 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            label="Heading 3"
          />
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            label="Bullet List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            label="Numbered List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={Quote}
            label="Quote"
          />
        </div>

        {/* Text Color */}
        <div className="relative border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker)
              setShowHighlightPicker(false)
            }}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Text Color"
          >
            <Palette size={18} />
            <ChevronDown size={14} />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    editor.chain().focus().setColor(color.value).run()
                    setShowColorPicker(false)
                  }}
                  className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <button
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker)
              setShowColorPicker(false)
            }}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Highlight"
          >
            <Highlighter size={18} />
            <ChevronDown size={14} />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-10 grid grid-cols-3 gap-1">
              {HIGHLIGHTS.map((highlight) => (
                <button
                  key={highlight.name}
                  onClick={() => {
                    if (highlight.value) {
                      editor.chain().focus().setHighlight({ color: highlight.value }).run()
                    } else {
                      editor.chain().focus().unsetHighlight().run()
                    }
                    setShowHighlightPicker(false)
                  }}
                  className="w-10 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform flex items-center justify-center text-xs"
                  style={{ backgroundColor: highlight.value || '#fff' }}
                  title={highlight.name}
                >
                  {highlight.name === 'None' ? <Type size={14} /> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            label="Undo (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            label="Redo (Ctrl+Y)"
          />
        </div>

        {/* AI Improve */}
        {showAIImprove && (
          <>
            <Button
              size="sm"
              onClick={handleImprove}
              disabled={improving}
              className="gap-2 bg-gray-700 hover:bg-gray-800 text-white mr-2"
            >
              {improving ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {improving ? 'Amélioration...' : 'Améliorer avec IA'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImprovementPrompt(!showImprovementPrompt)}
              className="gap-2 mr-2"
            >
              <Settings2 size={14} />
            </Button>
          </>
        )}

        {/* Save/Cancel buttons */}
        {onSave && onCancel && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button size="sm" onClick={onSave} className="bg-green-600 hover:bg-green-700 gap-1">
              <Save size={14} />
              Sauvegarder
            </Button>
          </div>
        )}
      </div>

      {/* Improvement Prompt Panel */}
      <AnimatePresence>
        {showImprovementPrompt && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '200px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 h-full flex flex-col">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt utilisé pour améliorer (tu peux le modifier)
              </label>
              <Textarea
                value={improvementPrompt}
                onChange={(e) => setImprovementPrompt(e.target.value)}
                className="flex-1 font-mono text-xs"
                placeholder="Prompt d'amélioration..."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Footer Stats */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-xs text-gray-500">
        <div className="flex gap-4">
          <span>{editor.storage.characterCount?.characters() || 0} characters</span>
          <span>{editor.storage.characterCount?.words() || 0} words</span>
        </div>
        <span className="text-gray-400">Markdown shortcuts: **bold**, *italic*, # heading</span>
      </div>
    </div>
  )
}
