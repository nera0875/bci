'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Shield, CheckCircle, XCircle, Loader2, ArrowLeft, Save } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import toast, { Toaster } from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const { apiConfig, updateApiConfig, testApiConnection, connectionStatus } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  const [localConfig, setLocalConfig] = useState({
    openai: '',
    claude: ''
  })
  const [isTesting, setIsTesting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Simulate initial load
    setTimeout(() => {
      setLocalConfig({
        openai: apiConfig.openai.apiKey,
        claude: apiConfig.claude.apiKey
      })
      setIsLoading(false)
    }, 100)
  }, [apiConfig])

  useEffect(() => {
    // Check if config has changed
    const changed = localConfig.openai !== apiConfig.openai.apiKey ||
                   localConfig.claude !== apiConfig.claude.apiKey
    setHasChanges(changed)
  }, [localConfig, apiConfig])

  const handleTestConnections = async () => {
    setIsTesting(true)

    // Update config first
    updateApiConfig({
      openai: { ...apiConfig.openai, apiKey: localConfig.openai },
      claude: { ...apiConfig.claude, apiKey: localConfig.claude }
    })

    // Test both connections
    const results = await Promise.all([
      localConfig.openai ? testApiConnection('openai') : Promise.resolve(),
      localConfig.claude ? testApiConnection('claude') : Promise.resolve()
    ])

    setIsTesting(false)

    // Show toast notifications
    if (connectionStatus.openai === 'connected') {
      toast.success('OpenAI connected successfully')
    } else if (localConfig.openai) {
      toast.error('OpenAI connection failed')
    }

    if (connectionStatus.claude === 'connected') {
      toast.success('Claude connected successfully')
    } else if (localConfig.claude) {
      toast.error('Claude connection failed')
    }
  }

  const handleSave = async () => {
    await handleTestConnections()
    setHasChanges(false)
  }

  const ConnectionIndicator = ({ status }: { status: string }) => {
    if (status === 'connected') return <CheckCircle className="w-5 h-5 text-green-500" />
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />
    if (status === 'checking') return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
    return <div className="w-5 h-5 rounded-full bg-gray-300" />
  }

  const canAccessProjects = connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500 text-sm">Configure your API connections</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-8">
          {/* Status Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Connection Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base text-gray-700">OpenAI API</span>
                <ConnectionIndicator status={connectionStatus.openai} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-gray-700">Claude API</span>
                <ConnectionIndicator status={connectionStatus.claude} />
              </div>
            </div>
            {!canAccessProjects && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Both API connections must be active to access projects
                </p>
              </div>
            )}
          </div>

          {/* API Keys Configuration */}
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 text-lg">API Keys</h3>

            {/* OpenAI */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-base font-medium text-gray-900">
                <span>OpenAI API Key</span>
                <ConnectionIndicator status={connectionStatus.openai} />
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={localConfig.openai}
                  onChange={(e) => setLocalConfig({ ...localConfig, openai: e.target.value })}
                  placeholder="sk-..."
                  className="w-full pl-11 pr-4 py-4 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Claude */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-base font-medium text-gray-900">
                <span>Claude API Key</span>
                <ConnectionIndicator status={connectionStatus.claude} />
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={localConfig.claude}
                  onChange={(e) => setLocalConfig({ ...localConfig, claude: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full pl-11 pr-4 py-4 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleTestConnections}
              disabled={isTesting || (!localConfig.openai && !localConfig.claude)}
              className="px-6 py-3 text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={isTesting || !hasChanges}
              className="px-6 py-3 text-base bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save
            </button>
          </div>

          {/* Info */}
          <div className="text-center text-gray-500 text-base">
            Your API keys are stored locally and used to connect with AI services.
            {canAccessProjects ? (
              <p className="text-green-600 mt-2 font-medium">✓ All connections active - You can access projects</p>
            ) : (
              <p className="text-red-600 mt-2 font-medium">⚠ Configure both APIs to access projects</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}