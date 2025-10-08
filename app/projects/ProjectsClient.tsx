'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  Plus, FolderOpen, Trash2, Settings,
  Loader2, Search, Grid3x3, List, Clock, LogOut
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Project {
  id: string
  name: string
  goal: string | null
  created_at: string
  user_id: string
}

export default function ProjectsClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectGoal, setNewProjectGoal] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setCreatingProject(true)
    try {
      const { data, error } = await (supabase as any)
        .from('projects')
        .insert({
          name: newProjectName,
          goal: newProjectGoal || null,
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setProjects([data, ...projects])
        setNewProjectName('')
        setNewProjectGoal('')
        setIsCreating(false)
        // Redirect to settings if API keys not configured
        router.push(`/settings?projectId=${data.id}&setup=true`)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Erreur lors de la création du projet')
    } finally {
      setCreatingProject(false)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Supprimer le projet "${projectName}" ? Cette action est irréversible.`)) {
      return
    }

    setDeletingProject(projectId)
    try {
      const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId) // Security: ensure user owns the project

      if (error) throw error

      setProjects(projects.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Erreur lors de la suppression du projet')
    } finally {
      setDeletingProject(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredProjects = projects.filter(p =>
    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#202123]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#202123]">BCI Tool v2</h1>
              <p className="text-[#6E6E80] text-sm mt-1">AI-Powered Pentesting</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 text-[#202123] hover:bg-[#F7F7F8] rounded-lg transition-colors flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-[#6E6E80] hover:bg-[#F7F7F8] rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6E80]" />
              <input
                type="text"
                placeholder="Rechercher un projet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-[#202123] placeholder:text-[#6E6E80] focus:outline-none focus:ring-2 focus:ring-[#202123] focus:border-transparent w-80"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#202123] text-white'
                    : 'text-[#6E6E80] hover:text-[#202123]'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#202123] text-white'
                    : 'text-[#6E6E80] hover:text-[#202123]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-2.5 bg-[#202123] hover:bg-[#2d2d30] text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau projet
          </button>
        </div>

        {/* Projects Grid/List */}
        {filteredProjects.length > 0 ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={async () => {
                    // Check if API keys are configured
                    const { data: proj } = await (supabase as any)
                      .from('projects')
                      .select('api_keys')
                      .eq('id', project.id)
                      .single()

                    if (!proj?.api_keys?.anthropic) {
                      router.push(`/settings?projectId=${project.id}&setup=true`)
                    } else {
                      router.push(`/chat/${project.id}`)
                    }
                  }}
                  className={`bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all group ${
                    deletingProject === project.id ? 'opacity-50' : ''
                  } ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-[#F7F7F8] rounded-xl flex items-center justify-center">
                          <FolderOpen className="w-6 h-6 text-[#202123]" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id, project.name)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>

                      <h3 className="text-lg font-semibold text-[#202123] mb-2">
                        {project.name}
                      </h3>

                      {project.goal && (
                        <p className="text-[#6E6E80] text-sm mb-4 line-clamp-2">
                          {project.goal}
                        </p>
                      )}

                      <div className="flex items-center text-xs text-[#6E6E80]">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {new Date(project.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-[#F7F7F8] rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-[#202123]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-[#202123]">
                          {project.name}
                        </h3>
                        <p className="text-sm text-[#6E6E80]">
                          {project.goal || 'Aucune description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-[#6E6E80]">
                          {new Date(project.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id, project.name)
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-[#F7F7F8] rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-10 h-10 text-[#6E6E80]" />
            </div>
            <h3 className="text-xl font-medium text-[#202123] mb-2">
              Aucun projet
            </h3>
            <p className="text-[#6E6E80] mb-8">
              Créez votre premier projet pour commencer
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-5 py-2.5 bg-[#202123] hover:bg-[#2d2d30] text-white font-medium rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Créer un projet
            </button>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => !creatingProject && setIsCreating(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-lg shadow-xl"
            >
              <h3 className="text-2xl font-semibold text-[#202123] mb-6">
                Nouveau projet
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#202123] mb-2">
                    Nom du projet
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Mon projet pentesting"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-[#202123] placeholder:text-[#6E6E80] focus:outline-none focus:ring-2 focus:ring-[#202123] focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleCreateProject()
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#202123] mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={newProjectGoal}
                    onChange={(e) => setNewProjectGoal(e.target.value)}
                    placeholder="Description courte..."
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-[#202123] placeholder:text-[#6E6E80] focus:outline-none focus:ring-2 focus:ring-[#202123] focus:border-transparent resize-none h-24"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewProjectName('')
                    setNewProjectGoal('')
                  }}
                  disabled={creatingProject}
                  className="px-4 py-2 text-[#202123] hover:bg-[#F7F7F8] rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || creatingProject}
                  className="px-5 py-2 bg-[#202123] hover:bg-[#2d2d30] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {creatingProject ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer'
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
