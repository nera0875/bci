'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'

export default function LoginPage() {
  const router = useRouter()
  const { apiConfig, updateApiConfig, testApiConnection, connectionStatus } = useAppStore()

  const [localConfig, setLocalConfig] = useState({
    openai: apiConfig.openai.apiKey,
    claude: apiConfig.claude.apiKey
  })
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (!localConfig.openai) {
      alert('Please enter at least OpenAI API key')
      return
    }

    setIsConnecting(true)

    // Update config
    updateApiConfig({
      openai: { ...apiConfig.openai, apiKey: localConfig.openai },
      claude: { ...apiConfig.claude, apiKey: localConfig.claude }
    })

    // Test connections
    await testApiConnection('openai')

    // Test Claude only if key is provided
    if (localConfig.claude) {
      await testApiConnection('claude')
    }

    setIsConnecting(false)

    // Navigate if OpenAI is connected (Claude is optional)
    setTimeout(() => {
      if (connectionStatus.openai === 'connected') {
        router.push('/projects')
      }
    }, 500)
  }

  const ConnectionIndicator = ({ status }: { status: string }) => {
    if (status === 'connected') return <CheckCircle className="w-5 h-5 text-success" />
    if (status === 'error') return <XCircle className="w-5 h-5 text-error" />
    if (status === 'checking') return <Loader2 className="w-5 h-5 text-warning animate-spin" />
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-foreground rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Shield className="w-10 h-10 text-background" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">BCI Tool</h1>
          <p className="text-muted-foreground">Intelligent Pentesting Assistant</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-foreground text-center">Connect Your APIs</h2>

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
              <span>Claude API Key <span className="text-xs text-muted-foreground">(Optional)</span></span>
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

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={isConnecting || !localConfig.openai}
            className="w-full py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect & Continue'
            )}
          </button>

          {/* Error Messages */}
          {connectionStatus.openai === 'error' && (
            <p className="text-sm text-error text-center">OpenAI connection failed. Please check your API key.</p>
          )}
          {connectionStatus.claude === 'error' && (
            <p className="text-sm text-error text-center">Claude connection failed. Please check your API key.</p>
          )}
        </div>

        {/* Info */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          Your API keys are stored locally and never sent to external servers.
        </p>
      </div>
    </div>
  )
}