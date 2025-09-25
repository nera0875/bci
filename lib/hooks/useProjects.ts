import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { ProjectService } from '@/lib/services/projectService'

export function useProjects() {
  const {
    projects,
    currentProject,
    projectsLoading,
    projectsError,
    loadProjects,
    createProject,
    selectProject,
    deleteProject,
    updateCurrentProject,
  } = useAppStore()

  // Auto-load projects on first use
  useEffect(() => {
    if (projects.length === 0 && !projectsLoading && !projectsError) {
      loadProjects()
    }
  }, [projects.length, projectsLoading, projectsError, loadProjects])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = ProjectService.subscribeToProjects((updatedProjects) => {
      useAppStore.setState({ projects: updatedProjects })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  return {
    projects,
    currentProject,
    projectsLoading,
    projectsError,
    createProject,
    selectProject,
    deleteProject,
    updateCurrentProject,
    refreshProjects,
  }
}