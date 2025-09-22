'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, Circle, AlertCircle, XCircle, Clock, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import type { Task } from '@/lib/types'

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  failed: XCircle,
}

const priorityColors = {
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-orange-600',
  critical: 'text-red-600',
}

export default function TaskManager() {
  const { currentProject, addTask, updateTask, deleteTask } = useAppStore()
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
  })

  const handleAddTask = () => {
    if (!newTask.title.trim() || !currentProject) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: 'pending',
      priority: newTask.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
    }

    addTask(task)
    setNewTask({ title: '', description: '', priority: 'medium' })
    setIsAddingTask(false)
  }

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    updateTask(taskId, { status })
  }

  const handleRetry = (taskId: string, task: Task) => {
    updateTask(taskId, {
      status: 'in_progress',
      attempts: task.attempts + 1,
    })
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select or create a project to manage tasks
      </div>
    )
  }

  const tasksByStatus = {
    pending: currentProject.tasks.filter((t) => t.status === 'pending'),
    in_progress: currentProject.tasks.filter((t) => t.status === 'in_progress'),
    done: currentProject.tasks.filter((t) => t.status === 'done'),
    failed: currentProject.tasks.filter((t) => t.status === 'failed'),
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Task Manager</h2>
          <p className="text-muted-foreground">
            {currentProject.tasks.length} tasks total
          </p>
        </div>
        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Task Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['pending', 'in_progress', 'done', 'failed'] as const).map((status) => {
          const Icon = statusIcons[status]
          return (
            <div key={status} className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5" />
                <h3 className="font-semibold capitalize">
                  {status.replace('_', ' ')}
                </h3>
                <span className="ml-auto text-sm text-muted-foreground">
                  {tasksByStatus[status].length}
                </span>
              </div>
              <div className="space-y-2">
                {tasksByStatus[status].map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-background border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <span className={`text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {task.attempts > 0 && `Attempts: ${task.attempts}`}
                      </span>
                      {status === 'failed' && (
                        <button
                          onClick={() => handleRetry(task.id, task)}
                          className="text-xs text-primary hover:underline"
                        >
                          Retry
                        </button>
                      )}
                      {status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'in_progress')}
                          className="text-xs text-primary hover:underline"
                        >
                          Start
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatusChange(task.id, 'done')}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Done
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id, 'failed')}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Failed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Task description (optional)"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTask.title.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}