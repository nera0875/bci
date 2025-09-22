'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, Trash2, ArrowRight, Shield, Settings, Lock, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'

export default function ProjectsPage() {
  const router = useRouter()
  const { projects, currentProject, createProject, selectProject, deleteProject, apiConfig, connectionStatus } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // No automatic redirect - projects page is the entry point

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    const project = await createProject(newProjectName)
    setNewProjectName('')
    setIsCreating(false)
    if (project && project.id) {
      router.push(`/chat/${project.id}`)
    }
  }

  const handleSelectProject = (projectId: string) => {
    // Check if both APIs are connected
    if (connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected') {
      selectProject(projectId)
      router.push(`/chat/${projectId}`)
    } else {
      alert('Please configure both API keys in Settings first')
      router.push('/settings')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">BCI Tool</h1>
              <p className="text-muted-foreground text-sm">Select or create a project</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Create New Project Card */}
        <button
          onClick={() => setIsCreating(true)}
          className="w-full mb-8 p-8 bg-card border-2 border-dashed border-border rounded-2xl hover:border-foreground transition-colors group"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 group-hover:bg-foreground transition-colors">
              <Plus className="w-8 h-8 text-foreground group-hover:text-background" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Create New Project</h3>
            <p className="text-muted-foreground">Start a new pentesting session with Claude</p>
          </div>
        </button>

        {/* Projects Grid */}
        {projects.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-6">Your Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card border border-border rounded-xl p-6 hover:border-foreground transition-all group relative"
                >
                  <button
                    onClick={() => handleSelectProject(project.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center group-hover:bg-foreground transition-colors">
                        <FolderOpen className="w-6 h-6 text-foreground group-hover:text-background" />
                      </div>
                      {connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected' ? (
                        <CheckCircle className="w-5 h-5 text-success" title="APIs connected" />
                      ) : (
                        <Lock className="w-5 h-5 text-warning" title="Configure APIs in Settings" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{project.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{project.requests.length} requests analyzed</p>
                      <p>{project.tasks.length} tasks created</p>
                      <p>{project.vulnerabilities.length} vulnerabilities found</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete project "${project.name}"?`)) {
                        deleteProject(project.id)
                      }
                    }}
                    className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {projects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-24 h-24 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-xl font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground">Create your first project to start pentesting with Claude</p>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-2xl p-8 w-full max-w-md animate-slide-up">
            <h3 className="text-2xl font-semibold mb-6">New Project</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground mb-6 text-foreground placeholder:text-muted-foreground bg-background"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewProjectName('')
                }}
                className="px-5 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-5 py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}