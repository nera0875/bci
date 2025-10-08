'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to projects page (will redirect to login if not authenticated via middleware)
    router.push('/projects')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-[#6E6E80]">Redirection...</div>
    </div>
  )
}