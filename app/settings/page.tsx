'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Shield, CheckCircle, XCircle, Loader2, ArrowLeft, Save } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import toast, { Toaster } from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const { apiConfig, updateApiConfig, testApiConnection, connectionStatus } = useAppStore()

  const [localConfig, setLocalConfig] = useState({
    openai: apiConfig.openai.apiKey,
    claude: apiConfig.claude.apiKey
  })
  const [isTesting, setIsTesting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

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
    if (status === 'connected') return <CheckCircle className="w-5 h-5 text-success" />
    if (status === 'error') return <XCircle className="w-5 h-5 text-error" />
    if (status === 'checking') return <Loader2 className="w-5 h-5 text-warning animate-spin" />
    return <div className="w-5 h-5 rounded-full bg-muted" />
  }

  const canAccessProjects = connectionStatus.openai === 'connected' && connectionStatus.claude === 'connected'

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground text-sm">Configure your API connections</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
          {/* Status Overview */}
          <div className="bg-muted rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">Connection Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">OpenAI API</span>
                <ConnectionIndicator status={connectionStatus.openai} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Claude API</span>
                <ConnectionIndicator status={connectionStatus.claude} />
              </div>
            </div>
            {!canAccessProjects && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">
                  Both API connections must be active to access projects
                </p>
              </div>
            )}
          </div>

          {/* API Keys Configuration */}
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground">API Keys</h3>

            {/* OpenAI */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>OpenAI API Key</span>
                <ConnectionIndicator status={connectionStatus.openai} />
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={localConfig.openai}
                  onChange={(e) => setLocalConfig({ ...localConfig, openai: e.target.value })}
                  placeholder="sk-..."
                  className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Claude */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>Claude API Key</span>
                <ConnectionIndicator status={connectionStatus.claude} />
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={localConfig.claude}
                  onChange={(e) => setLocalConfig({ ...localConfig, claude: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleTestConnections}
              disabled={isTesting || (!localConfig.openai && !localConfig.claude)}
              className="px-5 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={isTesting || !hasChanges}
              className="px-5 py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>

          {/* Info */}
          <div className="text-center text-muted-foreground text-sm">
            Your API keys are stored locally and used to connect with AI services.
            {canAccessProjects ? (
              <p className="text-success mt-2">✓ All connections active - You can access projects</p>
            ) : (
              <p className="text-error mt-2">⚠ Configure both APIs to access projects</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}