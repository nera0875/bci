'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, FolderOpen, Trash2, Shield, Settings, Lock, CheckCircle,
  ChevronRight, Zap, Target, FileText, Clock, AlertTriangle, ArrowUpRight,
  Loader2
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProjectsPageEnhanced() {
  const router = useRouter()
  const { projects, createProject, selectProject, deleteProject, connectionStatus } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [loadingProject, setLoadingProject] = useState<string | null>(null)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)

  const isConnected = connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected'

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setLoadingProject('creating')
    const project = await createProject(newProjectName, newProjectDescription)

    if (project && project.id) {
      setNewProjectName('')
      setNewProjectDescription('')
      setIsCreating(false)

      // Smooth transition to project
      setTimeout(() => {
        router.push(`/chat/${project.id}`)
      }, 300)
    }
    setLoadingProject(null)
  }

  const handleSelectProject = async (projectId: string) => {
    if (!isConnected) {
      router.push('/settings')
      return
    }

    setLoadingProject(projectId)
    selectProject(projectId)

    // Smooth transition
    setTimeout(() => {
      router.push(`/chat/${projectId}`)
    }, 200)
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) return

    setDeletingProject(projectId)
    await deleteProject(projectId)
    setDeletingProject(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Shield className="w-5 h-5 text-background" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">BCI Tool v2</h1>
                <p className="text-xs text-muted-foreground">Zero-Day Factory</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                {isConnected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">APIs Connected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Setup Required</span>
                  </>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {projects.reduce((acc, p) => acc + p.requests.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Requests Analyzed</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {projects.reduce((acc, p) => acc + p.vulnerabilities.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Vulnerabilities Found</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {projects.reduce((acc, p) => acc + p.tasks.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Tasks Created</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create New Project Card */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setIsCreating(true)}
          className="w-full mb-6 p-6 bg-gradient-to-r from-foreground/5 to-foreground/10 border-2 border-dashed border-foreground/20 rounded-xl hover:border-foreground/40 transition-all group"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-foreground/10 rounded-xl flex items-center justify-center group-hover:bg-foreground group-hover:scale-110 transition-all">
              <Plus className="w-6 h-6 text-foreground group-hover:text-background" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-foreground">Create New Project</h3>
              <p className="text-sm text-muted-foreground">Start a new AI-powered pentesting session</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground ml-auto" />
          </div>
        </motion.button>

        {/* Projects Grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                  className={`bg-card border border-border rounded-xl p-5 relative group cursor-pointer
                    ${loadingProject === project.id ? 'opacity-50' : ''}
                    ${deletingProject === project.id ? 'opacity-30' : ''}`}
                  onClick={() => handleSelectProject(project.id)}
                >
                  {/* Loading Overlay */}
                  {loadingProject === project.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl z-10">
                      <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-foreground/10 to-foreground/5 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-foreground" />
                    </div>

                    <div className="flex items-center gap-2">
                      {!isConnected && (
                        <Lock className="w-4 h-4 text-yellow-500" title="Configure APIs" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProject(project.id, project.name)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-foreground mb-1 truncate">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-lg font-semibold text-foreground">{project.requests.length}</p>
                      <p className="text-xs text-muted-foreground">Requests</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-lg font-semibold text-foreground">{project.vulnerabilities.length}</p>
                      <p className="text-xs text-muted-foreground">Vulns</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-lg font-semibold text-foreground">{project.tasks.length}</p>
                      <p className="text-xs text-muted-foreground">Tasks</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm">Create your first project to start pentesting with AI</p>
          </motion.div>
        )}
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-semibold mb-4">Create New Project</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., OWASP Testing"
                    className="w-full px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateProject()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description of the project goals..."
                    className="w-full px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground resize-none h-20"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewProjectName('')
                    setNewProjectDescription('')
                  }}
                  className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || loadingProject === 'creating'}
                  className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingProject === 'creating' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}