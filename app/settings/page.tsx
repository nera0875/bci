'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import SimpleApiSettings from '@/app/components/settings/SimpleApiSettings'
import { Toaster } from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat/6eb4e422-a10c-437e-a962-61af206d79ff')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500 text-sm">Configure your API connections and integrations</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        <SimpleApiSettings />
      </main>
    </div>
  )
}