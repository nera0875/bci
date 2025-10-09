'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Calendar,
  Activity, Database, Zap, CreditCard, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface CostsSectionProps {
  projectId: string
}

interface CostMetrics {
  totalCost: number
  totalSaved: number
  apiCalls: number
  cacheHits: number
  averageCostPerCall: number
  costByModel: Record<string, number>
  dailyCosts: { date: string; cost: number; saved: number }[]
}

// API Pricing (per 1M tokens)
const API_PRICING = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
}

export default function CostsSection({ projectId }: CostsSectionProps) {
  const [metrics, setMetrics] = useState<CostMetrics>({
    totalCost: 0,
    totalSaved: 0,
    apiCalls: 0,
    cacheHits: 0,
    averageCostPerCall: 0,
    costByModel: {},
    dailyCosts: []
  })
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCostMetrics()
    const interval = setInterval(loadCostMetrics, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [projectId, timeRange])

  const loadCostMetrics = async () => {
    try {
      // Get message history for cost calculation
      const startDate = new Date()
      if (timeRange === 'day') startDate.setDate(startDate.getDate() - 1)
      else if (timeRange === 'week') startDate.setDate(startDate.getDate() - 7)
      else startDate.setMonth(startDate.getMonth() - 1)

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (messages) {
        // Calculate costs from messages
        let totalCost = 0
        let totalSaved = 0
        let apiCalls = 0
        let cacheHits = 0
        const costByModel: Record<string, number> = {}
        const dailyData: Record<string, { cost: number; saved: number }> = {}

        messages.forEach(msg => {
          const metadata = (msg.metadata as any) || {}
          const model = metadata.model || 'claude-sonnet-4-5'
          const tokens = metadata.tokens || { input: 0, output: 0 }
          const cached = metadata.cached || false

          if (!cached) {
            apiCalls++
            const pricing = API_PRICING[model as keyof typeof API_PRICING] || API_PRICING['claude-sonnet-4-5']
            const cost = (tokens.input * pricing.input + tokens.output * pricing.output) / 1000000

            totalCost += cost
            costByModel[model] = (costByModel[model] || 0) + cost

            // Daily tracking
            const date = new Date(msg.created_at || new Date()).toLocaleDateString()
            if (!dailyData[date]) dailyData[date] = { cost: 0, saved: 0 }
            dailyData[date].cost += cost
          } else {
            cacheHits++
            // Estimate saved cost (80% reduction for cached responses)
            const pricing = API_PRICING[model as keyof typeof API_PRICING] || API_PRICING['claude-sonnet-4-5']
            const fullCost = (tokens.input * pricing.input + tokens.output * pricing.output) / 1000000
            const cachedCost = fullCost * 0.2 // 80% savings

            totalCost += cachedCost
            totalSaved += fullCost - cachedCost

            const date = new Date(msg.created_at || new Date()).toLocaleDateString()
            if (!dailyData[date]) dailyData[date] = { cost: 0, saved: 0 }
            dailyData[date].cost += cachedCost
            dailyData[date].saved += fullCost - cachedCost
          }
        })

        // Convert daily data to array
        const dailyCosts = Object.entries(dailyData)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-7) // Last 7 days

        setMetrics({
          totalCost,
          totalSaved,
          apiCalls,
          cacheHits,
          averageCostPerCall: apiCalls > 0 ? totalCost / apiCalls : 0,
          costByModel,
          dailyCosts
        })
      }
    } catch (error) {
      console.error('Error loading cost metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const cacheHitRate = metrics.apiCalls + metrics.cacheHits > 0
    ? (metrics.cacheHits / (metrics.apiCalls + metrics.cacheHits)) * 100
    : 0

  const maxDailyCost = Math.max(...metrics.dailyCosts.map(d => d.cost + d.saved), 0.01)

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <DollarSign className="text-green-500" size={28} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                API Costs & Savings
              </h2>
            </div>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map(range => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'default' : 'outline'}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    timeRange === range && "bg-gray-900 text-white"
                  )}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Cost</span>
                <TrendingUp className="text-red-500" size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(metrics.totalCost)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.apiCalls} API calls
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Saved</span>
                <TrendingDown className="text-green-500" size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(metrics.totalSaved)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.cacheHits} cache hits
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</span>
                <Database className="text-blue-500" size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {cacheHitRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Embeddings working
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Cost/Call</span>
                <Zap className="text-gray-700" size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(metrics.averageCostPerCall)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Per request
              </p>
            </motion.div>
          </div>
        </div>

        {/* Daily Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Costs & Savings
          </h3>
          <div className="space-y-3">
            {metrics.dailyCosts.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
                  {day.date}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div className="h-full flex">
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(day.cost / maxDailyCost) * 100}%` }}
                      />
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(day.saved / maxDailyCost) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
                    {formatCurrency(day.cost + day.saved)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">API Costs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">Saved by Cache</span>
            </div>
          </div>
        </div>

        {/* Cost by Model */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cost by Model
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.costByModel).map(([model, cost]) => (
              <div key={model} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {model}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(cost)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-500 mt-0.5" size={18} />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Cost Optimization Tips
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Your cache is saving you {((metrics.totalSaved / (metrics.totalCost + metrics.totalSaved)) * 100).toFixed(0)}% on API costs</li>
                <li>• Similar queries are automatically cached using embeddings</li>
                <li>• Claude 3.5 Sonnet is 5x cheaper than Opus for similar performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}