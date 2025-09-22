'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, FolderOpen, Trash2, Shield, Settings, Lock, CheckCircle,
  ChevronRight, Zap, Target, FileText, Clock, AlertTriangle,
  ArrowUpRight, Loader2, Brain, Activity, Database, Code,
  TrendingUp, Users, Package, Sparkles, Layers, BarChart3,
  GitBranch, Terminal, Bug, Search, Filter, Grid3x3,
  List, ChevronDown, MoreVertical, Star, Eye, Copy
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProjectsModern() {
  const router = useRouter()
  const { projects, createProject, selectProject, deleteProject, connectionStatus } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [loadingProject, setLoadingProject] = useState<string | null>(null)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'active' | 'archived'>('all')

  const isConnected = connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected'

  const filteredProjects = projects.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setLoadingProject('creating')
    const project = await createProject(newProjectName, newProjectDescription)

    if (project && project.id) {
      setNewProjectName('')
      setNewProjectDescription('')
      setIsCreating(false)

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

  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-5">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  BCI Tool v2
                </h1>
                <p className="text-sm text-zinc-500 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Zero-Day Factory powered by Claude Opus 4.1
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-2.5 ${
                  isConnected
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">All Systems Go</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">Setup Required</span>
                  </>
                )}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/settings')}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center gap-2 transition-all"
              >
                <Settings className="w-4 h-4" />
                Settings
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total Projects', value: projects.length, icon: FolderOpen, color: 'cyan', change: '+12%' },
            { label: 'Requests Analyzed', value: projects.reduce((acc, p) => acc + p.requests.length, 0), icon: Target, color: 'purple', change: '+34%' },
            { label: 'Vulnerabilities', value: projects.reduce((acc, p) => acc + p.vulnerabilities.length, 0), icon: Bug, color: 'red', change: '+67%' },
            { label: 'Success Rate', value: '94%', icon: TrendingUp, color: 'green', change: '+8%' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 bg-${stat.color}-500/10 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
                <span className={`text-xs font-medium text-${stat.color}-400`}>{stat.change}</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-zinc-500">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-80"
              />
            </div>

            {/* Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode */}
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Create Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreating(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-5 h-5" />
              New Project
            </motion.button>
          </div>
        </div>

        {/* Projects Grid/List */}
        <AnimatePresence mode="popLayout">
          {filteredProjects.length > 0 ? (
            <motion.div
              variants={containerAnimation}
              initial="hidden"
              animate="show"
              className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'space-y-3'
              }
            >
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  variants={itemAnimation}
                  layout
                  whileHover={{ scale: viewMode === 'grid' ? 1.02 : 1.01 }}
                  onClick={() => handleSelectProject(project.id)}
                  className={`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 cursor-pointer transition-all hover:border-cyan-500/30 group relative ${
                    loadingProject === project.id ? 'opacity-50' : ''
                  } ${deletingProject === project.id ? 'opacity-30' : ''} ${
                    viewMode === 'list' ? 'flex items-center justify-between' : ''
                  }`}
                >
                  {loadingProject === project.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    </div>
                  )}

                  {viewMode === 'grid' ? (
                    <>
                      {/* Grid View */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                          <FolderOpen className="w-7 h-7 text-cyan-400" />
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id, project.name)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{project.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-zinc-800/30 rounded-xl">
                          <p className="text-xl font-bold text-cyan-400">{project.requests.length}</p>
                          <p className="text-xs text-zinc-600">Requests</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-800/30 rounded-xl">
                          <p className="text-xl font-bold text-purple-400">{project.vulnerabilities.length}</p>
                          <p className="text-xs text-zinc-600">Vulns</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-800/30 rounded-xl">
                          <p className="text-xl font-bold text-green-400">{project.tasks.length}</p>
                          <p className="text-xs text-zinc-600">Tasks</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* List View */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                          <FolderOpen className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-white">{project.name}</h3>
                          <p className="text-sm text-zinc-500">
                            {project.requests.length} requests • {project.vulnerabilities.length} vulns • {project.tasks.length} tasks
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          <Clock className="w-3 h-3" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id, project.name)
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-12 h-12 text-zinc-600" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
              <p className="text-zinc-500">Create your first project to start pentesting with AI</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-lg"
            >
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                Create New Project
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., OWASP Testing, Client XYZ Audit"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateProject()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description of the project goals and scope..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none h-24"
                  />
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">AI Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">AI Model:</span>
                      <span className="text-cyan-400 font-medium">Claude Opus 4.1</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Mode:</span>
                      <span className="text-purple-400 font-medium">Zero-Day Hunter</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewProjectName('')
                    setNewProjectDescription('')
                  }}
                  className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || loadingProject === 'creating'}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
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