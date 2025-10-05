'use client'

import React from 'react'
import { Check } from 'lucide-react'

export type PromptStyle = 'normal' | 'concis' | 'apprentissage' | 'explicatif' | 'formel'

interface PromptStyleSelectorProps {
  currentStyle: PromptStyle
  onChange: (style: PromptStyle) => void
}

const PROMPT_STYLES = [
  {
    id: 'concis' as PromptStyle,
    label: 'Concis',
    description: 'Réponses courtes et directes',
    systemPrompt: 'Sois extrêmement concis. Réponds en 1-3 phrases maximum. Pas de blabla, juste les faits essentiels.'
  },
  {
    id: 'normal' as PromptStyle,
    label: 'Normal',
    description: 'Équilibre entre détail et concision',
    systemPrompt: 'Réponds de manière claire et équilibrée. Fournis les informations essentielles sans être trop verbeux.'
  },
  {
    id: 'apprentissage' as PromptStyle,
    label: 'Apprentissage',
    description: 'Explications pédagogiques détaillées',
    systemPrompt: 'Explique comme à un débutant. Détaille chaque concept, donne des exemples, et assure-toi que c\'est bien compris.'
  },
  {
    id: 'explicatif' as PromptStyle,
    label: 'Explicatif',
    description: 'Analyse approfondie avec contexte',
    systemPrompt: 'Fournis des explications détaillées avec contexte, raisonnement et justifications. Analyse en profondeur.'
  },
  {
    id: 'formel' as PromptStyle,
    label: 'Formel',
    description: 'Ton professionnel et structuré',
    systemPrompt: 'Utilise un ton formel et professionnel. Structure tes réponses clairement avec des sections bien définies.'
  }
]

export function PromptStyleSelector({ currentStyle, onChange }: PromptStyleSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const currentStyleObj = PROMPT_STYLES.find(s => s.id === currentStyle) || PROMPT_STYLES[1]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        title="Changer le style de réponse"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {currentStyleObj.label}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full mt-2 left-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 space-y-1">
              {PROMPT_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    onChange(style.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    currentStyle === style.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {style.label}
                        </span>
                        {currentStyle === style.id && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {style.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Export helper to get system prompt for a style
export function getStyleSystemPrompt(style: PromptStyle | string, customStyles?: any[]): string {
  // Chercher d'abord dans les styles prédéfinis
  const styleObj = PROMPT_STYLES.find(s => s.id === style)
  if (styleObj) {
    return styleObj.systemPrompt
  }

  // Chercher dans les styles personnalisés si fourni
  if (customStyles) {
    const customStyleObj = customStyles.find(s => s.id === style)
    if (customStyleObj) {
      return customStyleObj.systemPrompt
    }
  }

  // Fallback sur le style normal
  return PROMPT_STYLES[1].systemPrompt
}

// Export all styles for use in other components
export { PROMPT_STYLES }
