'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Target, Plus, Minus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'

interface ProjectGoalHeaderProps {
  projectId: string
}

interface ProgressData {
  percentage: number
  total_points: number
  facts_validated: number
  target_points: number
  project_name: string
  project_goal: string
}

export default function ProjectGoalHeader({ projectId }: ProjectGoalHeaderProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadProgress()
    const interval = setInterval(loadProgress, 3000)
    return () => clearInterval(interval)
  }, [projectId])

  const loadProgress = async () => {
    try {
      const { data: progressData } = await (supabase as any)
        .from('project_progress')
        .select('percentage, total_points, facts_validated, target_points')
        .eq('project_id', projectId)
        .single()

      const { data: projectData } = await (supabase as any)
        .from('projects')
        .select('name, goal')
        .eq('id', projectId)
        .single()

      if (progressData && projectData) {
        setProgress({
          ...progressData,
          project_name: projectData.name,
          project_goal: projectData.goal
        })
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const adjustProgress = async (pointsChange: number) => {
    try {
      await supabase.rpc('increment_progress', {
        p_project_id: projectId,
        p_points: pointsChange,
        p_facts_count: 0
      })
      await loadProgress()
      toast.success(`Progress ${pointsChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(pointsChange)} points`)
    } catch (error) {
      console.error('Error adjusting progress:', error)
      toast.error('Error adjusting progress')
    }
  }

  const resetProgress = async () => {
    if (!confirm('Reset progress to 0? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('project_progress')
        .update({ total_points: 0, facts_validated: 0 })
        .eq('project_id', projectId)

      if (error) throw error
      await loadProgress()
      toast.success('Progress reset')
    } catch (error) {
      console.error('Error resetting progress:', error)
      toast.error('Error resetting progress')
    }
  }

  if (!progress) return null

  const getProgressColor = () => {
    if (progress.percentage >= 100) return 'bg-green-500'
    if (progress.percentage >= 75) return 'bg-blue-500'
    if (progress.percentage >= 50) return 'bg-purple-500'
    return 'bg-gray-400'
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border-b border-[#E5E5E7] bg-white"
    >
      {/* Compact Header */}
      <CollapsibleTrigger className="w-full group">
        <div className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
              {isOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
              )}
              <Target className="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {progress.project_name}
              </span>
              <span className="text-xs text-gray-500">
                {progress.facts_validated} facts validés
              </span>
            </div>
          </div>

          {/* Mini Progress Indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor())}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900 tabular-nums">
                {progress.percentage}%
              </div>
              <div className="text-xs text-gray-500 tabular-nums">
                {progress.total_points}/{progress.target_points}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Expanded Details */}
      <CollapsibleContent>
        <div className="px-6 pb-4 pt-2 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
          {/* Project Goal */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Objectif du projet
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {progress.project_goal}
              </p>
            </div>
          </div>

          {/* Full Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Progression globale</span>
              <span className="font-bold text-gray-900 tabular-nums">
                {progress.total_points} / {progress.target_points} points
              </span>
            </div>
            <Progress
              value={progress.percentage}
              className="h-3"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Facts validés</div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {progress.facts_validated}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Total points</div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {progress.total_points}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Objectif</div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {progress.target_points}
              </div>
            </div>
          </div>

          {/* Manual Controls */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Ajustement manuel:</span>
            <button
              onClick={() => adjustProgress(5)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
              +5
            </button>
            <button
              onClick={() => adjustProgress(10)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
              +10
            </button>
            <button
              onClick={() => adjustProgress(-5)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Minus className="w-3 h-3" />
              -5
            </button>
            <button
              onClick={() => adjustProgress(-10)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Minus className="w-3 h-3" />
              -10
            </button>
            <div className="flex-1" />
            <button
              onClick={resetProgress}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
