'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ChatRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page des projets
    router.push('/projects')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirection vers les projets...</p>
      </div>
    </div>
  )
}