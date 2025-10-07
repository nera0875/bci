'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main project chat
    router.push('/chat/6eb4e422-a10c-437e-a962-61af206d79ff')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Redirecting to chat...</div>
    </div>
  )
}