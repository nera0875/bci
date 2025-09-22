import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import { generateUUID } from '@/lib/utils/uuid'
import type { Project, HttpRequest, Task, ChatMessage, EmbeddingRule, ApiConfig } from '@/lib/types'

interface AppState {
  // Projects
  projects: Project[]
  currentProject: Project | null

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
  createProject: (name: string, description?: string) => Promise<any>
  selectProject: (projectId: string) => void
  deleteProject: (projectId: string) => void

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      projects: [],
      currentProject: null,
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
      createProject: async (name, description) => {
        const project: Project = {
          id: generateUUID(),
          name,
          description,
          requests: [],
          tasks: [],
          vulnerabilities: [],
          chatHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Try to save to Supabase
        try {
          const { error } = await supabase
            .from('projects')
            .insert({
              id: project.id,
              name: project.name,
              api_keys: {
                openai: get().apiConfig.openai.apiKey || '',
                claude: get().apiConfig.claude.apiKey || ''
              }
            })

          if (error) {
            console.warn('Supabase insert failed, continuing with local storage:', error)
            // Continue anyway - we'll work locally
          }
        } catch (err) {
          console.warn('Supabase connection failed, continuing with local storage:', err)
          // Continue anyway - we'll work locally
        }

        // Always update local state
        set((state) => ({
          projects: [...state.projects, project],
          currentProject: project,
        }))

        return project
      },

      selectProject: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (project) {
          set({ currentProject: project })
        }
      },

      deleteProject: (projectId) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
        }))
      },

      // Request Actions
      addRequests: (requests) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set((state) => ({
          currentProject: {
            ...currentProject,
            requests: [...currentProject.requests, ...requests],
            updatedAt: new Date().toISOString(),
          },
        }))
      },

      updateRequest: (requestId, update) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set({
          currentProject: {
            ...currentProject,
            requests: currentProject.requests.map((r) =>
              r.id === requestId ? { ...r, ...update } : r
            ),
            updatedAt: new Date().toISOString(),
          },
        })
      },

      // Task Actions
      addTask: (task) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set({
          currentProject: {
            ...currentProject,
            tasks: [...currentProject.tasks, task],
            updatedAt: new Date().toISOString(),
          },
        })
      },

      updateTask: (taskId, update) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set({
          currentProject: {
            ...currentProject,
            tasks: currentProject.tasks.map((t) =>
              t.id === taskId ? { ...t, ...update, updatedAt: new Date().toISOString() } : t
            ),
            updatedAt: new Date().toISOString(),
          },
        })
      },

      deleteTask: (taskId) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set({
          currentProject: {
            ...currentProject,
            tasks: currentProject.tasks.filter((t) => t.id !== taskId),
            updatedAt: new Date().toISOString(),
          },
        })
      },

      // Chat Actions
      addChatMessage: (message) => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set({
          currentProject: {
            ...currentProject,
            chatHistory: [...currentProject.chatHistory, message],
            updatedAt: new Date().toISOString(),
          },
        })
      },

      clearChat: () => {
        const currentProject = get().currentProject
        if (!currentProject) return

        set({
          currentProject: {
            ...currentProject,
            chatHistory: [],
            updatedAt: new Date().toISOString(),
          },
        })
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
    }),
    {
      name: 'bci-tool-storage',
    }
  )
)