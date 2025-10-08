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
      className="border-b border-[#E5E5E7] bg-[#FFFFFF]"
    >
      {/* Compact Header - Aligned with sidebar */}
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between px-6 py-2.5 hover:bg-[#F7F7F8]/50 transition-colors">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-[#6E6E80] flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6E6E80] flex-shrink-0" />
            )}
            <Target className="w-4 h-4 text-[#6E6E80] flex-shrink-0" />
            <span className="text-sm font-medium text-[#202123] truncate">
              {progress.project_name}
            </span>
          </div>

          {/* Mini Progress Indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-32 h-1.5 bg-[#E5E5E7] rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor())}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#202123] w-10 text-right tabular-nums">
              {progress.percentage}%
            </span>
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Expanded Details */}
      <CollapsibleContent>
        <div className="px-6 pb-4 pt-1 space-y-4 bg-[#F7F7F8]/30">
          {/* Project Goal */}
          <div className="flex items-start gap-2 pt-1">
            <div className="w-1 h-4 bg-[#202123] rounded-full mt-0.5" />
            <p className="text-sm text-[#6E6E80] leading-relaxed">
              {progress.project_goal}
            </p>
          </div>

          {/* Full Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6E6E80] font-medium">Progression</span>
              <span className="font-semibold text-[#202123] tabular-nums">
                {progress.total_points} / {progress.target_points} points
              </span>
            </div>
            <Progress
              value={progress.percentage}
              className="h-2"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#FFFFFF] rounded-lg p-3 border border-[#E5E5E7] shadow-sm">
              <div className="text-xs text-[#6E6E80] mb-1.5 font-medium">Facts validés</div>
              <div className="text-xl font-bold text-[#202123] tabular-nums">
                {progress.facts_validated}
              </div>
            </div>
            <div className="bg-[#FFFFFF] rounded-lg p-3 border border-[#E5E5E7] shadow-sm">
              <div className="text-xs text-[#6E6E80] mb-1.5 font-medium">Total points</div>
              <div className="text-xl font-bold text-[#202123] tabular-nums">
                {progress.total_points}
              </div>
            </div>
            <div className="bg-[#FFFFFF] rounded-lg p-3 border border-[#E5E5E7] shadow-sm">
              <div className="text-xs text-[#6E6E80] mb-1.5 font-medium">Objectif</div>
              <div className="text-xl font-bold text-[#202123] tabular-nums">
                {progress.target_points}
              </div>
            </div>
          </div>

          {/* Manual Controls */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E5E5E7]">
            <span className="text-xs text-[#6E6E80] font-medium">Adjust:</span>
            <button
              onClick={() => adjustProgress(5)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#202123] text-white rounded hover:bg-[#2d2d30] transition-colors"
            >
              <Plus className="w-3 h-3" />
              +5
            </button>
            <button
              onClick={() => adjustProgress(10)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#202123] text-white rounded hover:bg-[#2d2d30] transition-colors"
            >
              <Plus className="w-3 h-3" />
              +10
            </button>
            <button
              onClick={() => adjustProgress(-5)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#6E6E80] text-white rounded hover:bg-[#555560] transition-colors"
            >
              <Minus className="w-3 h-3" />
              -5
            </button>
            <button
              onClick={() => adjustProgress(-10)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#6E6E80] text-white rounded hover:bg-[#555560] transition-colors"
            >
              <Minus className="w-3 h-3" />
              -10
            </button>
            <div className="flex-1" />
            <button
              onClick={resetProgress}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
