'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Sparkles, Eye, EyeOff, Settings2, RefreshCw, Save, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PromptEditorAdvancedProps {
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
  projectId?: string
}

const FONTS = [
  { name: 'Monospace', value: 'font-mono' },
  { name: 'Sans Serif', value: 'font-sans' },
  { name: 'Serif', value: 'font-serif' }
]

const FONT_SIZES = [
  { name: 'Small', value: 'text-sm' },
  { name: 'Medium', value: 'text-base' },
  { name: 'Large', value: 'text-lg' }
]

const THEMES = [
  { name: 'Default', bg: 'bg-white dark:bg-gray-900', text: 'text-gray-900 dark:text-white' },
  { name: 'GitHub', bg: 'bg-[#0d1117]', text: 'text-[#c9d1d9]' },
  { name: 'Monokai', bg: 'bg-[#272822]', text: 'text-[#f8f8f2]' },
  { name: 'Dracula', bg: 'bg-[#282a36]', text: 'text-[#f8f8f2]' },
  { name: 'Nord', bg: 'bg-[#2e3440]', text: 'text-[#eceff4]' }
]

const DEFAULT_IMPROVEMENT_PROMPT = `Tu es un expert en ingénierie de prompts (prompt engineering).

Ton rôle : Améliorer le prompt système ci-dessous pour qu'il soit :
- Plus clair et structuré
- Plus précis dans les instructions
- Plus efficace pour guider l'IA
- Mieux formaté (sections, listes, exemples)

RÈGLES IMPORTANTES :
1. Garde l'intention originale
2. Ajoute des exemples concrets si pertinent
3. Structure avec des sections claires
4. Utilise du Markdown pour la lisibilité
5. Reste concis mais complet

Prompt à améliorer :
---
{PROMPT}
---

Renvoie UNIQUEMENT le prompt amélioré, sans explications.`

export default function PromptEditorAdvanced({ initialContent, onSave, onCancel, projectId = 'default' }: PromptEditorAdvancedProps) {
  const [content, setContent] = useState(initialContent)
  const [font, setFont] = useState('font-mono')
  const [fontSize, setFontSize] = useState('text-sm')
  const [theme, setTheme] = useState(THEMES[0])
  const [showPreview, setShowPreview] = useState(false)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [improving, setImproving] = useState(false)
  const [showImprovementPrompt, setShowImprovementPrompt] = useState(false)
  const [improvementPrompt, setImprovementPrompt] = useState(DEFAULT_IMPROVEMENT_PROMPT)

  const handleImprove = async () => {
    setImproving(true)
    try {
      const finalPrompt = improvementPrompt.replace('{PROMPT}', content)

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: finalPrompt }
          ],
          projectId: projectId
        })
      })

      if (!response.ok) throw new Error('Failed to improve')

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
                setContent(improvedContent)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      toast.success('Prompt amélioré !')
    } catch (error) {
      toast.error('Erreur lors de l\'amélioration')
      console.error(error)
    }
    setImproving(false)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowStylePanel(!showStylePanel)}
            className="gap-2"
          >
            <Palette size={14} />
            Style
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>

          <Button
            size="sm"
            onClick={handleImprove}
            disabled={improving}
            className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
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
            className="gap-2"
          >
            <Settings2 size={14} />
            Prompt d'amélioration
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button size="sm" onClick={() => onSave(content)} className="bg-green-600 hover:bg-green-700">
            <Save size={14} className="mr-1" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Style Panel */}
      <AnimatePresence>
        {showStylePanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Font Family */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Police
                </label>
                <div className="flex gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFont(f.value)}
                      className={cn(
                        "px-3 py-1.5 rounded text-sm border",
                        font === f.value
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Taille
                </label>
                <div className="flex gap-2">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setFontSize(s.value)}
                      className={cn(
                        "px-3 py-1.5 rounded text-sm border",
                        fontSize === s.value
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Thème
                </label>
                <div className="flex gap-2 flex-wrap">
                  {THEMES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "px-3 py-1.5 rounded text-sm border",
                        theme.name === t.name
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Main Editor/Preview */}
      <div className="flex-1 overflow-hidden flex">
        {showPreview ? (
          /* Preview */
          <div className={cn("flex-1 overflow-auto p-6", theme.bg)}>
            <div className={cn("whitespace-pre-wrap", font, fontSize, theme.text)}>
              {content}
            </div>
          </div>
        ) : (
          /* Editor */
          <div className="flex-1 p-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={cn("w-full h-full resize-none", font, fontSize)}
              placeholder="Écris ton prompt système ici..."
            />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex gap-4">
          <span>{content.length} caractères</span>
          <span>{content.split(/\s+/).filter(Boolean).length} mots</span>
          <span>{content.split('\n').length} lignes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            {font.replace('font-', '')}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            {fontSize.replace('text-', '')}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            {theme.name}
          </span>
        </div>
      </div>
    </div>
  )
}
