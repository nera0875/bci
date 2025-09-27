import React, { useState, useEffect } from 'react'
import { Zap, TrendingUp, CheckCircle, XCircle, RefreshCw, Lightbulb } from 'lucide-react'

interface OptimizationSuggestion {
  id: string
  type: 'rule' | 'column' | 'structure'
  title: string
  description: string
  confidence: number
  basedOn: string
  action: any
}

interface OptimizationViewProps {
  projectId: string
  nodeId: string
  onSuggestionApply: () => void
}

export function OptimizationView({ projectId, nodeId, onSuggestionApply }: OptimizationViewProps) {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadOptimizationData()
  }, [nodeId])

  const loadOptimizationData = async () => {
    setLoading(true)
    try {
      // Charger les analytics
      const analyticsResponse = await fetch(`/api/optimization/analytics?projectId=${projectId}&nodeId=${nodeId}`)
      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json()
        setAnalytics(data.analytics)
      }

      // Charger les suggestions
      const suggestionsResponse = await fetch(`/api/optimization/suggestions?projectId=${projectId}&nodeId=${nodeId}`)
      if (suggestionsResponse.ok) {
        const data = await suggestionsResponse.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Erreur chargement optimisation:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/optimization/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          nodeId
        })
      })

      if (response.ok) {
        await loadOptimizationData()
      }
    } catch (error) {
      console.error('Erreur génération suggestions:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const applySuggestion = async (suggestion: OptimizationSuggestion) => {
    try {
      const response = await fetch('/api/optimization/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          action: suggestion.action
        })
      })

      if (response.ok) {
        await loadOptimizationData()
        onSuggestionApply()
      }
    } catch (error) {
      console.error('Erreur application suggestion:', error)
    }
  }

  const dismissSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/optimization/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      })

      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (error) {
      console.error('Erreur dismiss suggestion:', error)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'rule': return <Zap className="w-5 h-5 text-blue-600" />
      case 'column': return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'structure': return <Lightbulb className="w-5 h-5 text-purple-600" />
      default: return <Lightbulb className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Chargement...</div>
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Optimisation IA</h3>
        <button
          onClick={generateSuggestions}
          disabled={analyzing}
          className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyse...' : 'Analyser'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Analytics */}
        {analytics && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">📊 Analyse des Performances</h4>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{analytics.successRate}%</div>
                <div className="text-sm text-green-700">Taux de succès</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{analytics.rulesFollowed}</div>
                <div className="text-sm text-blue-700">Règles respectées</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">{analytics.totalActions}</div>
                <div className="text-sm text-purple-700">Actions analysées</div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">🤖 Suggestions d'Amélioration</h4>
          
          {suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSuggestionIcon(suggestion.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                            {Math.round(suggestion.confidence * 100)}% confiance
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                        <p className="text-xs text-gray-500">Basé sur : {suggestion.basedOn}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => applySuggestion(suggestion)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Appliquer
                      </button>
                      <button
                        onClick={() => dismissSuggestion(suggestion.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        <XCircle className="w-4 h-4" />
                        Ignorer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Aucune suggestion</p>
              <p className="text-sm mb-4">Cliquez sur "Analyser" pour générer des suggestions d'optimisation</p>
              <button
                onClick={generateSuggestions}
                disabled={analyzing}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {analyzing ? 'Analyse en cours...' : 'Lancer l\'analyse'}
              </button>
            </div>
          )}
        </div>

        {/* Conseils d'optimisation */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">💡 Conseils d'Optimisation</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• L'IA analyse vos 100 dernières actions pour détecter les patterns</li>
            <li>• Les suggestions sont basées sur vos succès répétés</li>
            <li>• Validez seulement les suggestions avec plus de 80% de confiance</li>
            <li>• Utilisez "Analyser" après chaque session de pentesting</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
