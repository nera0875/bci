'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, FolderOpen, Trash2, Shield, Settings,
  ChevronRight, Zap, Target, FileText, Clock, AlertTriangle,
  ArrowRight, Loader2, Brain, Activity, Database, Code,
  TrendingUp, Users, Package, Layers, BarChart3,
  GitBranch, Terminal, Bug, Search, Filter, Grid3x3,
  List, ChevronDown, MoreVertical, Star, Eye, Copy,
  CheckCircle, XCircle, Info, Server, Network, HardDrive
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

export default function ProjectsProfessional() {
  const router = useRouter()
  const { projects, createProject, selectProject, deleteProject, connectionStatus } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [loadingProject, setLoadingProject] = useState<string | null>(null)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  const isConnected = connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected'

  useEffect(() => {
    setMounted(true)
  }, [])

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
        staggerChildren: 0.06
      }
    }
  }

  const itemAnimation = {
    hidden: { opacity: 0, y: 5 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2
      }
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-gray-900">BCI Tool v2</h1>
                <p className="text-base text-gray-500">AI-Powered Penetration Testing</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`px-5 py-3 rounded-lg flex items-center gap-2.5 ${
                isConnected
                  ? 'bg-green-50 text-green-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}>
                {isConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-base font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-base font-medium">Setup Required</span>
                  </>
                )}
              </div>

              <button
                onClick={() => router.push('/settings')}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2.5 transition-colors text-base font-medium"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[
            { label: 'Projects', value: projects.length, icon: FolderOpen, trend: '+2 this week', color: 'text-blue-600 bg-blue-100' },
            { label: 'Requests', value: projects.reduce((acc, p) => acc + p.requests.length, 0), icon: Target, trend: '+45 analyzed', color: 'text-green-600 bg-green-100' },
            { label: 'Vulnerabilities', value: projects.reduce((acc, p) => acc + p.vulnerabilities.length, 0), icon: Bug, trend: 'Critical: 3', color: 'text-red-600 bg-red-100' },
            { label: 'Tasks', value: projects.reduce((acc, p) => acc + p.tasks.length, 0), icon: Zap, trend: '12 completed', color: 'text-purple-600 bg-purple-100' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className="text-sm text-gray-500">{stat.trend}</span>
              </div>
              <p className="text-3xl font-semibold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-base text-gray-600">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-5 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-96 text-base"
              />
            </div>

            {/* View Mode */}
            <div className="flex bg-white border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded transition-all ${
                  viewMode === 'grid'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg flex items-center gap-2.5 transition-colors text-base"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Projects Grid/List */}
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {filteredProjects.length > 0 ? (
              <motion.div
                variants={containerAnimation}
                initial="hidden"
                animate="show"
                className={viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
                }
              >
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layoutId={project.id}
                    variants={itemAnimation}
                    onClick={() => handleSelectProject(project.id)}
                    className={`bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all hover:shadow-md group relative ${
                      loadingProject === project.id ? 'opacity-50' : ''
                    } ${deletingProject === project.id ? 'opacity-30' : ''} ${
                      viewMode === 'list' ? 'flex items-center justify-between' : ''
                    }`}
                  >
                    {loadingProject === project.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                      </div>
                    )}

                    {viewMode === 'grid' ? (
                      <>
                        {/* Grid View */}
                        <div className="flex items-start justify-between mb-5">
                          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                            <FolderOpen className="w-7 h-7 text-gray-700" />
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id, project.name)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{project.name}</h3>
                        {project.description && (
                          <p className="text-base text-gray-500 mb-5 line-clamp-2">{project.description}</p>
                        )}

                        <div className="grid grid-cols-3 gap-3 mb-5">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xl font-semibold text-gray-900">{project.requests.length}</p>
                            <p className="text-sm text-gray-500">Requests</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xl font-semibold text-gray-900">{project.vulnerabilities.length}</p>
                            <p className="text-sm text-gray-500">Vulns</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xl font-semibold text-gray-900">{project.tasks.length}</p>
                            <p className="text-sm text-gray-500">Tasks</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* List View */}
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-gray-700" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                            <p className="text-base text-gray-500">
                              {project.requests.length} requests • {project.vulnerabilities.length} vulns • {project.tasks.length} tasks
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProject(project.id, project.name)
                              }}
                              className="p-2.5 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
                  <FolderOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">No projects yet</h3>
                <p className="text-base text-gray-500 mb-8">Create your first project to start pentesting with AI</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg inline-flex items-center gap-2.5 transition-colors text-base"
                >
                  <Plus className="w-5 h-5" />
                  Create First Project
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-xl p-10 w-full max-w-lg shadow-xl"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-8">Create New Project</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-3">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., OWASP Testing"
                    className="w-full px-5 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-base"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateProject()}
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-3">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-5 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none h-28 text-base"
                  />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Server className="w-5 h-5 text-gray-500" />
                    <h4 className="text-base font-medium text-gray-700">AI Configuration</h4>
                  </div>
                  <div className="space-y-2 text-base text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Model:</span>
                      <span className="font-medium">Claude Opus 4.1</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Mode:</span>
                      <span className="font-medium">Zero-Day Hunter</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-10">
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewProjectName('')
                    setNewProjectDescription('')
                  }}
                  className="px-5 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || loadingProject === 'creating'}
                  className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 transition-colors text-base font-medium"
                >
                  {loadingProject === 'creating' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}