'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Activity, Brain,
  Calendar, Clock, Target, Zap, Database,
  FileText, MessageSquare, CheckCircle, ChevronLeft, ChevronRight, Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface AnalyticsSectionProps {
  projectId: string
}

interface Metrics {
  totalMemoryNodes: number
  totalRules: number
  activeRules: number
  suggestionsAccepted: number
  suggestionsRejected: number
  averageConfidence: number
  patternDetections: number
  queryResponseTime: number
  automationRate: number
  learningProgress: number
  // Cache metrics
  cacheHitRate: number
  totalCostSaved: number
  averageCostPerMessage: number
  totalMessages: number
  cachedMessages: number
}

interface ActivityItem {
  id: string
  type: 'memory' | 'rule' | 'suggestion' | 'pattern'
  action: string
  timestamp: string
  details: string
}

export default function AnalyticsSection({ projectId }: AnalyticsSectionProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    totalMemoryNodes: 0,
    totalRules: 0,
    activeRules: 0,
    suggestionsAccepted: 0,
    suggestionsRejected: 0,
    averageConfidence: 0,
    patternDetections: 0,
    queryResponseTime: 0,
    automationRate: 0,
    learningProgress: 0,
    cacheHitRate: 0,
    totalCostSaved: 0,
    averageCostPerMessage: 0,
    totalMessages: 0,
    cachedMessages: 0
  })

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)

  // Pagination & filters
  const [currentPage, setCurrentPage] = useState(1)
  const [activityFilter, setActivityFilter] = useState<'all' | 'memory' | 'rule' | 'suggestion' | 'pattern'>('all')
  const itemsPerPage = 10

  useEffect(() => {
    loadMetrics()
    loadActivities()
  }, [projectId, timeRange])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics/metrics?projectId=${projectId}&range=${timeRange}`)
      const data = await response.json()
      setMetrics(data.metrics || data)
    } catch (error) {
      console.error('Error loading metrics:', error)
      // Use mock data for now
      setMetrics({
        totalMemoryNodes: 47,
        totalRules: 12,
        activeRules: 10,
        suggestionsAccepted: 23,
        suggestionsRejected: 5,
        averageConfidence: 0.82,
        patternDetections: 15,
        queryResponseTime: 245,
        automationRate: 0.67,
        learningProgress: 0.73,
        // Cache metrics (mock)
        cacheHitRate: 0.35, // 35% de cache hits
        totalCostSaved: 0.0142, // $0.0142 saved
        averageCostPerMessage: 0.00023,
        totalMessages: 156,
        cachedMessages: 55
      })
    }
    setLoading(false)
  }

  const loadActivities = async () => {
    try {
      const response = await fetch(`/api/analytics/activities?projectId=${projectId}&range=${timeRange}`)
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Error loading activities:', error)
      // Use mock data for now
      setActivities([
        {
          id: '1',
          type: 'suggestion',
          action: 'Auto-saved frequent query',
          timestamp: '2 hours ago',
          details: 'Query pattern detected and stored'
        },
        {
          id: '2',
          type: 'rule',
          action: 'New rule created',
          timestamp: '5 hours ago',
          details: 'Authentication check rule'
        },
        {
          id: '3',
          type: 'pattern',
          action: 'Pattern detected',
          timestamp: '1 day ago',
          details: 'Repeated API test sequence'
        }
      ])
    }
  }

  const MetricCard = ({
    icon: Icon,
    label,
    value,
    unit = '',
    trend = 0,
    color = 'blue'
  }: {
    icon: any
    label: string
    value: number | string
    unit?: string
    trend?: number
    color?: string
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      amber: 'text-amber-600 bg-amber-50'
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-2">
          <div className={cn("p-2 rounded-lg", colorClasses[color as keyof typeof colorClasses])}>
            <Icon size={20} />
          </div>
          {trend !== 0 && (
            <div className={cn(
              "flex items-center text-xs",
              trend > 0 ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp size={12} className={trend < 0 ? "rotate-180" : ""} />
              <span className="ml-1">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {typeof value === 'number' && value > 100 ? value.toLocaleString() : value}{unit}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {label}
        </div>
      </motion.div>
    )
  }

  const ProgressBar = ({ value, label, color = 'blue' }: { value: number; label: string; color?: string }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      amber: 'bg-amber-500'
    }

    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {Math.round(value * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-2 rounded-full", colorClasses[color as keyof typeof colorClasses])}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Learning Analytics
              </h2>
              <p className="text-sm text-gray-500">
                System performance and optimization metrics
              </p>
            </div>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="day">Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={Database}
            label="Memory Nodes"
            value={metrics.totalMemoryNodes}
            trend={12}
            color="blue"
          />
          <MetricCard
            icon={FileText}
            label="Active Rules"
            value={`${metrics.activeRules}/${metrics.totalRules}`}
            trend={8}
            color="purple"
          />
          <MetricCard
            icon={CheckCircle}
            label="Acceptance Rate"
            value={Math.round((metrics.suggestionsAccepted / (metrics.suggestionsAccepted + metrics.suggestionsRejected)) * 100)}
            unit="%"
            trend={5}
            color="green"
          />
          <MetricCard
            icon={Clock}
            label="Response Time"
            value={metrics.queryResponseTime}
            unit="ms"
            trend={-15}
            color="amber"
          />
        </div>

        {/* Cache Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Zap className="text-green-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cache Performance
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round((metrics.cacheHitRate || 0) * 100)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Cache Hit Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                ${(metrics.totalCostSaved || 0).toFixed(4)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {metrics.cachedMessages || 0}/{metrics.totalMessages || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Cached Messages</div>
            </div>
          </div>

          <ProgressBar value={metrics.cacheHitRate || 0} label="Cache Efficiency" color="green" />

          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Average cost: ${(metrics.averageCostPerMessage || 0).toFixed(6)}/message</span>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            System Intelligence
          </h3>
          <ProgressBar value={metrics.learningProgress} label="Learning Progress" color="blue" />
          <ProgressBar value={metrics.automationRate} label="Automation Rate" color="green" />
          <ProgressBar value={metrics.averageConfidence} label="Average Confidence" color="purple" />
          <ProgressBar value={metrics.patternDetections / 30} label="Pattern Detection Rate" color="amber" />
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Activity
            </h3>

            {/* Filter dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={activityFilter}
                onChange={(e) => {
                  setActivityFilter(e.target.value as any)
                  setCurrentPage(1) // Reset to first page on filter change
                }}
                className="px-3 py-1 border rounded-lg text-sm bg-white dark:bg-gray-700"
              >
                <option value="all">All Activities</option>
                <option value="memory">Memory</option>
                <option value="rule">Rules</option>
                <option value="suggestion">Suggestions</option>
                <option value="pattern">Patterns</option>
              </select>
              <Activity size={20} className="text-gray-400" />
            </div>
          </div>

          {/* Filtered & Paginated Activities */}
          <div className="space-y-4 mb-4">
            {activities
              .filter(a => activityFilter === 'all' || a.type === activityFilter)
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((activity, index) => (
                <motion.div
                  key={activity.id || `activity-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    activity.type === 'memory' && "bg-blue-100 text-blue-600 dark:bg-blue-900/20",
                    activity.type === 'rule' && "bg-purple-100 text-purple-600 dark:bg-purple-900/20",
                    activity.type === 'suggestion' && "bg-green-100 text-green-600 dark:bg-green-900/20",
                    activity.type === 'pattern' && "bg-amber-100 text-amber-600 dark:bg-amber-900/20"
                  )}>
                    {activity.type === 'memory' && <Brain size={16} />}
                    {activity.type === 'rule' && <Target size={16} />}
                    {activity.type === 'suggestion' && <Zap size={16} />}
                    {activity.type === 'pattern' && <Activity size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {activity.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {activity.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activity.details}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>

          {/* Pagination Controls */}
          {(() => {
            const filteredActivities = activities.filter(a => activityFilter === 'all' || a.type === activityFilter)
            const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)

            if (totalPages <= 1) return null

            return (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-sm",
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Learning Insights */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI Insights
            </h3>
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>System learning rate improved by 15% this week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>3 new patterns detected and ready for automation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>Rule efficiency increased by 22% through optimizations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}