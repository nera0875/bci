'use client'

import { useState, useEffect } from 'react'
import { Target, Save, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface GoalBarProps {
  projectId: string
  initialGoal: string
}

export default function GoalBar({ projectId, initialGoal }: GoalBarProps) {
  const [goal, setGoal] = useState(initialGoal)
  const [isEditing, setIsEditing] = useState(false)
  const [tempGoal, setTempGoal] = useState(goal)

  const handleSave = async () => {
    if (tempGoal.trim() === goal) {
      setIsEditing(false)
      return
    }

    const { error } = await supabase
      .from('projects')
      .update({ goal: tempGoal.trim() })
      .eq('id', projectId)

    if (!error) {
      setGoal(tempGoal.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setTempGoal(goal)
    setIsEditing(false)
  }

  return (
    <div className="h-16 border-b border-border bg-card flex items-center px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-background" />
        </div>

        {isEditing ? (
          <div className="flex-1 flex items-center gap-3">
            <input
              type="text"
              value={tempGoal}
              onChange={(e) => setTempGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
              placeholder="Set your goal for this session..."
              className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-2 text-success hover:bg-muted rounded-lg transition-colors"
              title="Save"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              title="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1">
              {goal ? (
                <div className="text-foreground font-medium">{goal}</div>
              ) : (
                <div className="text-muted-foreground italic">Click to set a goal for this session</div>
              )}
            </div>
            <button
              onClick={() => {
                setIsEditing(true)
                setTempGoal(goal)
              }}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              title="Edit goal"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span className="text-muted-foreground">Active</span>
      </div>
    </div>
  )
}