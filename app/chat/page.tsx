'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ChatRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers le chat principal
    router.push('/chat/6eb4e422-a10c-437e-a962-61af206d79ff')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirection vers le chat...</p>
      </div>
    </div>
  )
}