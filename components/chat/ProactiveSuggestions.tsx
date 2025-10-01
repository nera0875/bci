'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Lightbulb, Target, Zap, TrendingUp, Clock } from 'lucide-react'
import { useLearningSystem } from '@/lib/services/learningSystem'
// Fonction intégrée directement (pentestingPrompts supprimé)
const generateTestSuggestions = () => []

interface ProactiveSuggestionsProps {
  projectId: string
  currentContext: string
  lastUserMessage: string
  onSuggestionClick: (suggestion: string) => void
}

export function ProactiveSuggestions({ 
  projectId, 
  currentContext, 
  lastUserMessage,
  onSuggestionClick 
}: ProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [patterns, setPatterns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const { getSuggestions, getTopPatterns, predictEffectiveness } = useLearningSystem(projectId)

  // Charger les suggestions basées sur l'apprentissage
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!currentContext || currentContext === '*') return

      setLoading(true)
      try {
        // Suggestions basées sur l'apprentissage
        const learningSuggestions = await getSuggestions(currentContext)
        
        // Suggestions basées sur le contexte
        const contextSuggestions = generateTestSuggestions(currentContext, lastUserMessage)
        
        // Combiner et déduplicater
        const allSuggestions = [...learningSuggestions, ...contextSuggestions]
        const uniqueSuggestions = Array.from(new Set(allSuggestions))
        
        setSuggestions(uniqueSuggestions.slice(0, 6)) // Max 6 suggestions
        
        // Charger les top patterns pour info
        const topPatterns = await getTopPatterns(5)
        setPatterns(topPatterns)
        
        setIsVisible(uniqueSuggestions.length > 0)
      } catch (error) {
        console.error('Error loading suggestions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSuggestions()
  }, [currentContext, lastUserMessage, projectId])

  // Calculer la couleur selon l'efficacité
  const getEffectivenessColor = (rate: number): string => {
    if (rate >= 0.7) return 'text-green-600 bg-green-50 border-green-200'
    if (rate >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200' 
    return 'text-red-600 bg-red-50 border-red-200'
  }

  // Obtenir l'icône selon le contexte
  const getContextIcon = () => {
    switch (currentContext) {
      case 'business-logic': return <Target className="w-4 h-4" />
      case 'authentication': return <Brain className="w-4 h-4" />
      case 'api-requests': return <Zap className="w-4 h-4" />
      case 'success': return <TrendingUp className="w-4 h-4" />
      case 'failed': return <Clock className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  if (!isVisible || loading) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-40">
      <div className="flex items-center gap-2 mb-3">
        {getContextIcon()}
        <h3 className="font-semibold text-gray-800">Suggestions IA</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          {currentContext}
        </span>
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {/* Suggestions d'actions */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-500 font-medium">ACTIONS RECOMMANDÉES</p>
        {suggestions.slice(0, 4).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full text-left p-2 text-sm rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3 h-3 text-blue-500" />
              <span className="text-gray-700">{suggestion}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Top patterns avec efficacité */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">TECHNIQUES EFFICACES</p>
          {patterns.slice(0, 3).map((pattern, index) => {
            const rate = pattern.success_rate || 0
            return (
              <div
                key={pattern.id}
                className={`p-2 text-xs rounded-lg border ${getEffectivenessColor(rate)}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{pattern.pattern_type}</span>
                  <span className="font-bold">{Math.round(rate * 100)}%</span>
                </div>
                <div className="text-xs opacity-75">
                  Utilisé {pattern.usage_count} fois
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Suggestions de next steps */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => onSuggestionClick(`Optimise la stratégie pour ${currentContext}`)}
          className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          💡 Optimiser la stratégie actuelle
        </button>
      </div>
    </div>
  )
}

// Hook pour gérer les suggestions intelligentes dans le chat
export function useProactiveSuggestions(projectId: string) {
  const [currentContext, setCurrentContext] = useState<string>('*')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const { getSuggestions, recordSuccess, recordFailure } = useLearningSystem(projectId)

  const showSuggestions = async (context: string, userMessage: string) => {
    setCurrentContext(context)
    
    try {
      const learningSuggestions = await getSuggestions(context)
      const contextSuggestions = generateTestSuggestions(context, userMessage)
      
      const allSuggestions = [...learningSuggestions, ...contextSuggestions]
      const uniqueSuggestions = Array.from(new Set(allSuggestions))
      
      setSuggestions(uniqueSuggestions.slice(0, 6))
      setIsVisible(uniqueSuggestions.length > 0)
    } catch (error) {
      console.error('Error showing suggestions:', error)
    }
  }

  const hideSuggestions = () => {
    setIsVisible(false)
  }

  const recordUserFeedback = async (technique: string, success: boolean, details: any = {}) => {
    if (success) {
      await recordSuccess(technique, currentContext, details)
    } else {
      await recordFailure(technique, currentContext, details)
    }
  }

  return {
    currentContext,
    suggestions,
    isVisible,
    showSuggestions,
    hideSuggestions,
    recordUserFeedback
  }
}
