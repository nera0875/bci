'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Activity, Brain, Target, DollarSign, Zap, TrendingUp } from 'lucide-react'

interface StatsPanelProps {
  projectId: string
}

interface Metrics {
  memoryItems: number
  activeRules: number
  suggestionsAccepted: number
  suggestionsRejected: number
  cacheHitRate: number
  totalCostSaved: number
  totalPatterns: number
  avgConfidence: number
}

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
}

export default function StatsPanel({ projectId }: StatsPanelProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    memoryItems: 0,
    activeRules: 0,
    suggestionsAccepted: 0,
    suggestionsRejected: 0,
    cacheHitRate: 0,
    totalCostSaved: 0,
    totalPatterns: 0,
    avgConfidence: 0
  })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
    loadActivities()
  }, [projectId])

  const loadMetrics = async () => {
    try {
      setLoading(true)

      // ✅ Memory items count (NEW: memory_facts instead of memory_nodes)
      const { count: memCount } = await supabase
        .from('memory_facts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Active rules count
      const { count: rulesCount } = await supabase
        .from('rules')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('enabled', true)

      // ✅ Suggestions accepted/rejected (NEW: using chat_messages metadata)
      // Count MEMORY_ACTION blocks validated/rejected from chat
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('metadata')
        .eq('project_id', projectId)
        .eq('role', 'assistant')

      let acceptedCount = 0
      let rejectedCount = 0

      if (chatMessages) {
        chatMessages.forEach((msg: any) => {
          if (msg.metadata?.memory_actions_validated) acceptedCount++
          if (msg.metadata?.memory_actions_rejected) rejectedCount++
        })
      }

      // ✅ Cache hit rate (NEW: from chat_messages token usage)
      const { data: messagesWithTokens } = await supabase
        .from('chat_messages')
        .select('token_usage')
        .eq('project_id', projectId)
        .eq('role', 'assistant')
        .not('token_usage', 'is', null)

      let totalRequests = 0
      let cachedRequests = 0
      let totalCost = 0

      if (messagesWithTokens) {
        totalRequests = messagesWithTokens.length
        messagesWithTokens.forEach((msg: any) => {
          if (msg.token_usage?.cached) cachedRequests++
          if (msg.token_usage?.cost) totalCost += msg.token_usage.cost
        })
      }

      const hitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0

      // Total cost saved (based on cache hits - 75% savings on cached requests)
      const costSaved = cachedRequests > 0 ? (totalCost / totalRequests) * cachedRequests * 0.75 : 0

      // Patterns count and avg confidence
      const { data: patterns } = await supabase
        .from('learned_patterns')
        .select('confidence')
        .eq('project_id', projectId)

      const patternCount = patterns?.length || 0
      const avgConf = patterns && patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0

      setMetrics({
        memoryItems: memCount || 0,
        activeRules: rulesCount || 0,
        suggestionsAccepted: acceptedCount,
        suggestionsRejected: rejectedCount,
        cacheHitRate: hitRate,
        totalCostSaved: costSaved,
        totalPatterns: patternCount,
        avgConfidence: avgConf
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActivities = async () => {
    try {
      // ✅ Get recent chat messages as activities (NEW: using chat_messages)
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, metadata')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (messages) {
        const formattedActivities: ActivityItem[] = []

        messages.forEach((msg: any) => {
          // User messages
          if (msg.role === 'user') {
            formattedActivities.push({
              id: msg.id,
              type: 'user_message',
              description: `💬 ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`,
              timestamp: msg.created_at
            })
          }

          // Memory actions validated
          if (msg.metadata?.memory_actions_validated) {
            formattedActivities.push({
              id: `${msg.id}_validated`,
              type: 'accept',
              description: '✅ Memory action validated',
              timestamp: msg.created_at
            })
          }

          // Memory actions rejected
          if (msg.metadata?.memory_actions_rejected) {
            formattedActivities.push({
              id: `${msg.id}_rejected`,
              type: 'reject',
              description: '❌ Memory action rejected',
              timestamp: msg.created_at
            })
          }
        })

        setActivities(formattedActivities.slice(0, 10))
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Brain}
            label="Memory Items"
            value={metrics.memoryItems}
            color="bg-blue-600"
          />
          <StatCard
            icon={Target}
            label="Règles Actives"
            value={metrics.activeRules}
            color="bg-purple-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Patterns Détectés"
            value={metrics.totalPatterns}
            subtext={`Confiance moyenne: ${Math.round(metrics.avgConfidence * 100)}%`}
            color="bg-green-600"
          />
          <StatCard
            icon={Zap}
            label="Cache Hit Rate"
            value={`${Math.round(metrics.cacheHitRate)}%`}
            color="bg-yellow-600"
          />
        </div>

        {/* Suggestions Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            📊 Suggestions
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.suggestionsAccepted + metrics.suggestionsRejected}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {metrics.suggestionsAccepted}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Acceptées</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {metrics.suggestionsRejected}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rejetées</p>
            </div>
          </div>
          {(metrics.suggestionsAccepted + metrics.suggestionsRejected) > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Taux d'acceptation</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {Math.round((metrics.suggestionsAccepted / (metrics.suggestionsAccepted + metrics.suggestionsRejected)) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cost Savings */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <DollarSign size={32} className="text-green-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Coûts économisés (cache)</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                ${metrics.totalCostSaved.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Grâce au système de cache intelligent
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Activité Récente
          </h3>
          {activities.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Aucune activité récente
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    activity.type === 'accept'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : activity.type === 'reject'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {activity.type === 'user_message' ? 'message' : activity.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
