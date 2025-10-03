import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { generateUUID, isValidUUID } from '@/lib/utils/uuid'
import type { Project, HttpRequest, Task, ChatMessage, EmbeddingRule, ApiConfig } from '@/lib/types'

interface AppState {
  // Projects
  projects: Project[]
  currentProject: Project | null
  projectsLoading: boolean
  projectsError: string | null

  // API Config
  apiConfig: ApiConfig
  connectionStatus: {
    openai: 'idle' | 'checking' | 'connected' | 'error'
    claude: 'idle' | 'checking' | 'connected' | 'error'
  }

  // Embedding Rules
  embeddingRules: EmbeddingRule[]

  // UI State
  selectedRequests: string[]
  isAnalyzing: boolean

  // Actions
  loadProjects: () => Promise<void>
  createProject: (name: string, description?: string) => Promise<any>
  selectProject: (projectId: string) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  updateCurrentProject: (updates: Partial<Project>) => Promise<void>

  addRequests: (requests: HttpRequest[]) => void
  updateRequest: (requestId: string, update: Partial<HttpRequest>) => void

  addTask: (task: Task) => void
  updateTask: (taskId: string, update: Partial<Task>) => void
  deleteTask: (taskId: string) => void

  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void

  updateApiConfig: (config: Partial<ApiConfig>) => void
  testApiConnection: (api: 'openai' | 'claude') => Promise<void>

  addEmbeddingRule: (rule: EmbeddingRule) => void
  updateEmbeddingRule: (ruleId: string, update: Partial<EmbeddingRule>) => void
  deleteEmbeddingRule: (ruleId: string) => void
  reorderEmbeddingRules: (rules: EmbeddingRule[]) => void

  // Cleanup invalid projects
  cleanupInvalidProjects: () => void
}

export const useAppStore = create<AppState>()(
  (set, get) => ({
      // Initial State
      projects: [],
      currentProject: null,
      projectsLoading: false,
      projectsError: null,
      apiConfig: {
        openai: {
          apiKey: '',
          model: 'gpt-4-turbo-preview',
          embeddingModel: 'text-embedding-3-small',
        },
        claude: {
          apiKey: '',
          model: 'claude-3-opus-20240229', // Claude 3 Opus
          maxTokens: 4096,
        },
      },
      connectionStatus: {
        openai: 'idle',
        claude: 'idle',
      },
      embeddingRules: [
        {
          id: '1',
          name: 'Extract Parameters',
          prompt: 'Extract all URL parameters and form data',
          active: true,
          order: 0,
        },
      ],
      selectedRequests: [],
      isAnalyzing: false,

      // Project Actions
      loadProjects: async () => {
        set({ projectsLoading: true, projectsError: null })
        try {
          const { data: projects, error } = await (supabase as any)
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error
          set({ projects: projects || [], projectsLoading: false })
        } catch (error) {
          console.error('Failed to load projects:', error)
          set({
            projectsError: 'Failed to load projects',
            projectsLoading: false
          })
        }
      },

      createProject: async (name, description) => {
        const apiKeys = {
          openai: get().apiConfig.openai.apiKey || '',
          claude: get().apiConfig.claude.apiKey || ''
        }

        try {
          const { data: project, error } = await (supabase as any)
            .from('projects')
            .insert({
              name,
              goal: description,
              api_keys: apiKeys,
              settings: {}
            })
            .select()
            .single()

          if (error) throw error

          if (project) {
            // Update local state with the new project
            set((state) => ({
              projects: [project, ...state.projects],
              currentProject: project,
            }))
            return project
          }
        } catch (error) {
          console.error('Failed to create project:', error)
          return null
        }
      },

      selectProject: async (projectId) => {
        // First check local state
        let project = get().projects.find((p) => p.id === projectId)

        if (!project) {
          // If not in local state, fetch from Supabase
          try {
            const { data, error } = await (supabase as any)
              .from('projects')
              .select('*')
              .eq('id', projectId)
              .single()
            
            if (!error && data) {
              project = data
            }
          } catch (error) {
            console.error('Failed to fetch project:', error)
          }
        }

        if (project) {
          set({ currentProject: project })
        }
      },

      deleteProject: async (projectId) => {
        try {
          const { error } = await (supabase as any)
            .from('projects')
            .delete()
            .eq('id', projectId)

          if (!error) {
            set((state) => ({
              projects: state.projects.filter((p) => p.id !== projectId),
              currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
            }))
            return true
          }
        } catch (error) {
          console.error('Failed to delete project:', error)
        }
        return false
      },

      updateCurrentProject: async (updates) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        try {
          // Update in Supabase
          const { error } = await (supabase as any)
            .from('projects')
            .update(updatedProject)
            .eq('id', currentProject.id)

          if (!error) {
            // Update local state
            set((state) => ({
              currentProject: updatedProject,
              projects: state.projects.map(p =>
                p.id === currentProject.id ? updatedProject : p
              ),
            }))
          }
        } catch (error) {
          console.error('Failed to update project:', error)
        }
      },

      // Request Actions
      addRequests: async (requests) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          requests: [...currentProject.requests, ...requests],
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ requests: updatedProject.requests })
      },

      updateRequest: async (requestId, update) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedRequests = currentProject.requests.map((r) =>
          r.id === requestId ? { ...r, ...update } : r
        )

        const updatedProject = {
          ...currentProject,
          requests: updatedRequests,
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ requests: updatedRequests })
      },

      // Task Actions
      addTask: async (task) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedTasks = [...currentProject.tasks, task]
        const updatedProject = {
          ...currentProject,
          tasks: updatedTasks,
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ tasks: updatedTasks })
      },

      updateTask: async (taskId, update) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedTasks = currentProject.tasks.map((t) =>
          t.id === taskId ? { ...t, ...update, updatedAt: new Date().toISOString() } : t
        )

        const updatedProject = {
          ...currentProject,
          tasks: updatedTasks,
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ tasks: updatedTasks })
      },

      deleteTask: async (taskId) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedTasks = currentProject.tasks.filter((t) => t.id !== taskId)
        const updatedProject = {
          ...currentProject,
          tasks: updatedTasks,
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ tasks: updatedTasks })
      },

      // Chat Actions
      addChatMessage: async (message) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedChatHistory = [...currentProject.chatHistory, message]
        const updatedProject = {
          ...currentProject,
          chatHistory: updatedChatHistory,
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ chatHistory: updatedChatHistory })
      },

      clearChat: async () => {
        const currentProject = get().currentProject
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          chatHistory: [],
          updatedAt: new Date().toISOString(),
        }

        set({ currentProject: updatedProject })
        await get().updateCurrentProject({ chatHistory: [] })
      },

      // API Actions
      updateApiConfig: (config) => {
        set((state) => ({
          apiConfig: {
            openai: { ...state.apiConfig.openai, ...config.openai },
            claude: { ...state.apiConfig.claude, ...config.claude },
          },
        }))
      },

      testApiConnection: async (api) => {
        set((state) => ({
          connectionStatus: {
            ...state.connectionStatus,
            [api]: 'checking',
          },
        }))

        try {
          const response = await fetch(`/api/${api}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: get().apiConfig[api].apiKey }),
          })

          set((state) => ({
            connectionStatus: {
              ...state.connectionStatus,
              [api]: response.ok ? 'connected' : 'error',
            },
          }))
        } catch {
          set((state) => ({
            connectionStatus: {
              ...state.connectionStatus,
              [api]: 'error',
            },
          }))
        }
      },

      // Embedding Rules Actions
      addEmbeddingRule: (rule) => {
        set((state) => ({
          embeddingRules: [...state.embeddingRules, rule],
        }))
      },

      updateEmbeddingRule: (ruleId, update) => {
        set((state) => ({
          embeddingRules: state.embeddingRules.map((r) =>
            r.id === ruleId ? { ...r, ...update } : r
          ),
        }))
      },

      deleteEmbeddingRule: (ruleId) => {
        set((state) => ({
          embeddingRules: state.embeddingRules.filter((r) => r.id !== ruleId),
        }))
      },

      reorderEmbeddingRules: (rules) => {
        set({ embeddingRules: rules })
      },

      // Cleanup invalid projects
      cleanupInvalidProjects: () => {
        set((state) => {
          const validProjects = state.projects.filter(project => {
            if (!isValidUUID(project.id)) {
              console.warn('Removing project with invalid UUID:', project.id, project.name)
              return false
            }
            return true
          })

          // If current project has invalid ID, reset it
          const currentProjectValid = state.currentProject && isValidUUID(state.currentProject.id)

          return {
            projects: validProjects,
            currentProject: currentProjectValid ? state.currentProject : null
          }
        })
      },
    })
)