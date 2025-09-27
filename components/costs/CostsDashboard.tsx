import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Zap, Clock, X } from 'lucide-react'

interface CostsDashboardProps {
  projectId: string
  conversationId?: string
  isOpen: boolean
  onClose: () => void
}

interface CostSummary {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCachedTokens: number
  totalCost: number
  totalCacheSavings: number
  cacheEfficiency: number
}

interface UsageRecord {
  id: string
  model_name: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  total_cost: number
  cache_savings: number
  created_at: string
  conversation_id?: string
}

export function CostsDashboard({ projectId, conversationId, isOpen, onClose }: CostsDashboardProps) {
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [usage, setUsage] = useState<UsageRecord[]>([])
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCosts()
    }
  }, [isOpen, period, projectId, conversationId])

  const loadCosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        projectId,
        period
      })
      
      if (conversationId) {
        params.append('conversationId', conversationId)
      }

      const response = await fetch(`/api/costs/track?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setSummary(data.summary)
        setUsage(data.usage)
      }
    } catch (error) {
      console.error('Erreur chargement coûts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `${(cost * 1000).toFixed(2)}¢`
    }
    return `$${cost.toFixed(3)}`
  }

  const formatTokens = (tokens: number) => {
    if (tokens > 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold">
              Dashboard Coûts {conversationId ? '- Conversation' : '- Projet'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtres */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p === 'today' ? "Aujourd'hui" : 
                 p === 'week' ? 'Cette semaine' :
                 p === 'month' ? 'Ce mois' : 'Tout'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : summary ? (
            <>
              {/* Résumé */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Coût Total</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCost(summary.totalCost)}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Cache Économisé</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCost(summary.totalCacheSavings)}
                  </div>
                  <div className="text-xs text-green-700">
                    {summary.cacheEfficiency.toFixed(1)}% efficacité
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Tokens Total</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatTokens(summary.totalInputTokens + summary.totalOutputTokens)}
                  </div>
                  <div className="text-xs text-purple-700">
                    {formatTokens(summary.totalCachedTokens)} en cache
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Requêtes</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {summary.totalRequests}
                  </div>
                </div>
              </div>

              {/* Détail des requêtes */}
              <div className="bg-white border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold">Détail des Requêtes</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {usage.map((record) => (
                    <div key={record.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">
                            {record.model_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">
                            {formatCost(parseFloat(record.total_cost.toString()))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTokens(record.input_tokens + record.output_tokens)} tokens
                          </div>
                          {record.cached_tokens > 0 && (
                            <div className="text-xs text-green-600">
                              -{formatCost(parseFloat(record.cache_savings.toString()))} cache
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conseils d'optimisation */}
              {summary.cacheEfficiency < 30 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">💡 Optimisations suggérées</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Efficacité cache faible ({summary.cacheEfficiency.toFixed(1)}%)</li>
                    <li>• Réutilisez plus les conversations existantes</li>
                    <li>• Activez le résumé automatique pour les longs chats</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucune donnée de coût pour cette période
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
