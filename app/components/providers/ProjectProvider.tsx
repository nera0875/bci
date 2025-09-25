'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { MigrationService } from '@/lib/services/migrationService'

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const { loadProjects } = useAppStore()

  useEffect(() => {
    const initialize = async () => {
      try {
        // First attempt to migrate any localStorage data
        console.log('[ProjectProvider] Starting migration check...')
        await MigrationService.migrateFromLocalStorage()

        // Then load all projects from Supabase
        console.log('[ProjectProvider] Loading projects from Supabase...')
        await loadProjects()

        console.log('[ProjectProvider] Initialization complete')
      } catch (error) {
        console.error('[ProjectProvider] Initialization error:', error)
      } finally {
        setInitialized(true)
      }
    }

    if (!initialized) {
      initialize()
    }
  }, [initialized, loadProjects])

  // Show loading state during initialization
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-gray-600">Initializing project system...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}