'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Code, List, ListOrdered, Heading1, Heading2,
  Sparkles, RefreshCw, Eye, Edit3, Undo2, ChevronRight, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownEditorProProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  projectId: string

  // Behavior customization
  showPreview?: boolean
  showAIImprove?: boolean
  minHeight?: string

  // Callbacks
  onSave?: () => void
  onCancel?: () => void

  // AI improvement customization
  defaultPrompt?: string
  improvementContext?: string // Extra context pour l'IA (ex: "This is a system prompt", "This is a security playbook")
}

export default function MarkdownEditorPro({
  content,
  onChange,
  placeholder = 'Start writing...',
  projectId,
  showPreview = true,
  showAIImprove = true,
  minHeight = '300px',
  onSave,
  onCancel,
  defaultPrompt,
  improvementContext = ''
}: MarkdownEditorProProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [previousContent, setPreviousContent] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [improvementPrompt, setImprovementPrompt] = useState(
    defaultPrompt ||
    `You are an expert technical writer and security researcher.

${improvementContext ? `Context: ${improvementContext}\n\n` : ''}Improve the following content to be more clear, professional, and well-structured. Maintain markdown formatting.

Content:
{content}

Return ONLY the improved markdown content, nothing else.`
  )

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Toolbar actions
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)

    onChange(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**'), label: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), label: 'Italic' },
    { icon: Code, action: () => insertMarkdown('`', '`'), label: 'Inline code' },
    { icon: Heading1, action: () => insertMarkdown('# '), label: 'Heading 1' },
    { icon: Heading2, action: () => insertMarkdown('## '), label: 'Heading 2' },
    { icon: List, action: () => insertMarkdown('- '), label: 'Bullet list' },
    { icon: ListOrdered, action: () => insertMarkdown('1. '), label: 'Numbered list' },
  ]

  const handleImprove = async (selectedOnly: boolean = false) => {
    const textarea = textareaRef.current
    let textToImprove = content

    if (selectedOnly && textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start === end) {
        toast.error('Sélectionnez du texte à améliorer')
        return
      }
      textToImprove = content.substring(start, end)
    }

    if (!textToImprove.trim()) {
      toast.error('Aucun contenu à améliorer')
      return
    }

    setPreviousContent(content)
    setIsImproving(true)

    try {
      // Load project settings
      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (!projectRes.ok) throw new Error('Failed to load project settings')

      const project = await projectRes.json()
      const apiKeys = project.api_keys || {}
      const aiModel = project.settings?.aiModel || 'claude-sonnet-4-5-20250929'

      if (!apiKeys.anthropic) {
        toast.error('API key Anthropic manquante')
        setIsImproving(false)
        return
      }

      const finalPrompt = improvementPrompt.replace('{content}', textToImprove)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

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

      clearTimeout(timeout)

      if (!response.ok) throw new Error('API request failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let improvedText = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'content' && data.content) {
                improvedText += data.content

                // Update content (replace selection if selectedOnly)
                if (selectedOnly && textarea) {
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const newContent = content.substring(0, start) + improvedText + content.substring(end)
                  onChange(newContent)
                } else {
                  onChange(improvedText)
                }
              }
            } catch (e) {}
          }
        }
      }

      toast.success(selectedOnly ? 'Sélection améliorée !' : 'Contenu amélioré !')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Timeout: amélioration trop longue')
      } else {
        toast.error('Erreur lors de l\'amélioration')
        console.error(error)
      }
    } finally {
      setIsImproving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Left: Formatting tools */}
        <div className="flex items-center gap-1">
          {toolbarButtons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              disabled={isImproving || isPreviewMode}
              title={btn.label}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <btn.icon size={16} />
            </button>
          ))}
        </div>

        {/* Right: AI + Preview toggle */}
        <div className="flex items-center gap-2">
          {previousContent && (
            <button
              onClick={() => {
                onChange(previousContent)
                setPreviousContent('')
                toast.success('Version précédente restaurée')
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
            >
              <Undo2 size={12} />
              Annuler
            </button>
          )}

          {showAIImprove && (
            <>
              <button
                onClick={() => handleImprove(true)}
                disabled={isImproving}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed"
              >
                {isImproving ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Amélioration...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span>Sélection</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleImprove(false)}
                disabled={isImproving}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black disabled:from-gray-400 disabled:to-gray-500 text-white rounded transition-colors disabled:cursor-not-allowed"
              >
                {isImproving ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Amélioration...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span>Tout</span>
                  </>
                )}
              </button>
            </>
          )}

          {showPreview && (
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isPreviewMode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {isPreviewMode ? (
                <>
                  <Edit3 size={12} />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <Eye size={12} />
                  <span>Preview</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4" style={{ minHeight }}>
        {isPreviewMode ? (
          <div className="prose dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      wrapLongLines={true}
                      customStyle={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={`${className} break-words`} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={isImproving}
            className="w-full h-full min-h-full resize-none font-mono text-sm border-0 focus:ring-0 focus:outline-none bg-transparent whitespace-pre-wrap break-words overflow-wrap-anywhere"
            style={{ minHeight }}
          />
        )}
      </div>

      {/* AI Prompt Editor (collapsible) */}
      {showAIImprove && (
        <div className="px-4 pb-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 py-2"
          >
            <ChevronRight size={14} className={`transition-transform ${showPromptEditor ? 'rotate-90' : ''}`} />
            {showPromptEditor ? 'Masquer' : 'Modifier'} le prompt d'amélioration
          </button>

          {showPromptEditor && (
            <div className="pb-3">
              <Textarea
                value={improvementPrompt}
                onChange={(e) => setImprovementPrompt(e.target.value)}
                placeholder="Personnalisez le prompt..."
                rows={6}
                className="text-xs font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Utilisez <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">{'{content}'}</code> pour insérer le contenu à améliorer
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons (if callbacks provided) */}
      {(onSave || onCancel) && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isImproving}
            >
              Annuler
            </Button>
          )}
          {onSave && (
            <Button
              onClick={onSave}
              disabled={isImproving}
              className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black"
            >
              Enregistrer
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
