'use client'

import { useState, useEffect } from 'react'
import { Save, TestTube, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'

export default function Settings() {
  const { apiConfig, updateApiConfig, testApiConnection, connectionStatus } = useAppStore()

  const [localConfig, setLocalConfig] = useState(apiConfig)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalConfig(apiConfig)
  }, [apiConfig])

  const handleSave = async () => {
    setIsSaving(true)
    updateApiConfig(localConfig)

    // Test both connections
    await Promise.all([
      testApiConnection('openai'),
      testApiConnection('claude')
    ])

    setIsSaving(false)
  }

  const handleTestConnection = async (api: 'openai' | 'claude') => {
    await testApiConnection(api)
  }

  const StatusIndicator = ({ status }: { status: string }) => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Connection Failed</span>
          </div>
        )
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Testing...</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Not configured</span>
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure your API keys and models</p>
        </div>

        {/* OpenAI Configuration */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">OpenAI Configuration</h2>
            <StatusIndicator status={connectionStatus.openai} />
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={localConfig.openai.apiKey}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      openai: { ...localConfig.openai, apiKey: e.target.value }
                    })
                  }
                  placeholder="sk-..."
                  className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                />
                <button
                  onClick={() => handleTestConnection('openai')}
                  disabled={!localConfig.openai.apiKey || connectionStatus.openai === 'checking'}
                  className="px-4 py-3 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TestTube className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Chat Model</label>
                <select
                  value={localConfig.openai.model}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      openai: { ...localConfig.openai, model: e.target.value }
                    })
                  }
                  className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                >
                  <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Embedding Model</label>
                <select
                  value={localConfig.openai.embeddingModel}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      openai: { ...localConfig.openai, embeddingModel: e.target.value }
                    })
                  }
                  className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                >
                  <option value="text-embedding-3-large">Text Embedding 3 Large</option>
                  <option value="text-embedding-3-small">Text Embedding 3 Small</option>
                  <option value="text-embedding-ada-002">Text Embedding Ada 002</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Claude Configuration */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Claude Configuration</h2>
            <StatusIndicator status={connectionStatus.claude} />
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={localConfig.claude.apiKey}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      claude: { ...localConfig.claude, apiKey: e.target.value }
                    })
                  }
                  placeholder="sk-ant-..."
                  className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                />
                <button
                  onClick={() => handleTestConnection('claude')}
                  disabled={!localConfig.claude.apiKey || connectionStatus.claude === 'checking'}
                  className="px-4 py-3 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TestTube className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={localConfig.claude.model}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      claude: { ...localConfig.claude, model: e.target.value }
                    })
                  }
                  className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                >
                  <option value="claude-opus-4-1-20250805">Claude Opus 4.1</option>
                  <option value="claude-opus-4-20250805">Claude Opus 4</option>
                  <option value="claude-sonnet-4-20250805">Claude Sonnet 4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Tokens</label>
                <input
                  type="number"
                  value={localConfig.claude.maxTokens}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      claude: { ...localConfig.claude, maxTokens: parseInt(e.target.value) }
                    })
                  }
                  min="100"
                  max="100000"
                  className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-base font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Configuration
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-muted/50 border rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Your API keys are stored locally in your browser and never sent to any external server.</p>
              <p>The keys are only used to communicate directly with OpenAI and Anthropic APIs through our proxy routes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}