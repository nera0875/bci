'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  RefreshCw,
  Shield,
  Database,
  Brain,
  Bot
} from 'lucide-react'
import { SupabaseApiKeyService } from '@/lib/services/apiKeyService'
import toast from 'react-hot-toast'

interface ApiConfig {
  name: string
  displayName: string
  description: string
  icon: React.ElementType
  placeholder: string
  required: boolean
  verifyEndpoint?: string
}

const API_CONFIGS: ApiConfig[] = [
  {
    name: 'mem0',
    displayName: 'Mem0 AI',
    description: 'Cloud memory management for AI agents',
    icon: Brain,
    placeholder: 'mem0_sk_...',
    required: true
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT models and embeddings',
    icon: Bot,
    placeholder: 'sk-...',
    required: true
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    description: 'Claude AI models',
    icon: Bot,
    placeholder: 'sk-ant-...',
    required: true
  },
  {
    name: 'supabase',
    displayName: 'Supabase',
    description: 'Database and authentication',
    icon: Database,
    placeholder: 'eyJ...',
    required: true
  }
]

export default function ApiConfigCenter() {
  const [apiKeys, setApiKeys] = useState<Record<string, any>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [verifying, setVerifying] = useState<Record<string, boolean>>({})
  const [apiKeyService, setApiKeyService] = useState<SupabaseApiKeyService | null>(null)

  useEffect(() => {
    const initService = async () => {
      const service = new SupabaseApiKeyService(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      setApiKeyService(service)
      await loadApiKeys(service)
    }
    initService()
  }, [])

  const loadApiKeys = async (service: SupabaseApiKeyService) => {
    try {
      const keys = await service.getAll()
      const keysMap: Record<string, any> = {}
      keys.forEach(key => {
        keysMap[key.service_name] = key
      })
      setApiKeys(keysMap)
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const handleSaveKey = async (serviceName: string, apiKey: string) => {
    if (!apiKeyService) return

    setLoading({ ...loading, [serviceName]: true })

    try {
      // First, save the key (this will auto-verify)
      const saved = await apiKeyService.save(serviceName, apiKey)

      // Immediately update the UI with the saved key
      setApiKeys({ ...apiKeys, [serviceName]: saved })

      // Provide immediate feedback based on validation
      if (saved.is_valid) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{serviceName} API key saved and verified!</span>
          </div>
        )
      } else {
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span>{serviceName} API key saved but verification failed</span>
          </div>
        )
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to save {serviceName} API key. Make sure the table exists in Supabase.</span>
        </div>
      )
    } finally {
      setLoading({ ...loading, [serviceName]: false })
    }
  }

  const handleVerifyKey = async (serviceName: string) => {
    if (!apiKeyService) return

    setVerifying({ ...verifying, [serviceName]: true })

    try {
      const isValid = await apiKeyService.verify(serviceName)

      setApiKeys({
        ...apiKeys,
        [serviceName]: {
          ...apiKeys[serviceName],
          is_valid: isValid,
          last_verified_at: isValid ? new Date().toISOString() : null
        }
      })

      if (isValid) {
        toast.success(`${serviceName} API key verified successfully ✓`)
      } else {
        toast.error(`${serviceName} API key verification failed`)
      }
    } catch (error) {
      toast.error(`Failed to verify ${serviceName} API key`)
    } finally {
      setVerifying({ ...verifying, [serviceName]: false })
    }
  }

  const handleDeleteKey = async (serviceName: string) => {
    if (!apiKeyService) return

    if (!confirm(`Are you sure you want to delete the ${serviceName} API key?`)) {
      return
    }

    try {
      await apiKeyService.delete(serviceName)
      const newKeys = { ...apiKeys }
      delete newKeys[serviceName]
      setApiKeys(newKeys)
      toast.success(`${serviceName} API key deleted`)
    } catch (error) {
      toast.error(`Failed to delete ${serviceName} API key`)
    }
  }

  const getStatusIcon = (serviceName: string) => {
    const key = apiKeys[serviceName]
    if (!key) return <AlertCircle className="w-5 h-5 text-gray-400" />
    if (verifying[serviceName]) return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
    if (key.is_valid) return <CheckCircle2 className="w-5 h-5 text-green-500" />
    return <XCircle className="w-5 h-5 text-red-500" />
  }

  const allRequiredKeysValid = API_CONFIGS
    .filter(config => config.required)
    .every(config => apiKeys[config.name]?.is_valid)

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">API Configuration Center</h2>
              <p className="text-gray-500 text-sm">Secure management of your API keys</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            allRequiredKeysValid
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            {allRequiredKeysValid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700 text-sm font-medium">All systems operational</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-700 text-sm font-medium">Configuration required</span>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{
              width: `${(Object.values(apiKeys).filter(k => k?.is_valid).length / API_CONFIGS.length) * 100}%`
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {Object.values(apiKeys).filter(k => k?.is_valid).length} of {API_CONFIGS.length} APIs configured
        </p>
      </div>

      {/* API Keys Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {API_CONFIGS.map((config, index) => {
            const Icon = config.icon
            const currentKey = apiKeys[config.name]
            const isVisible = showKeys[config.name]

            return (
              <motion.div
                key={config.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white border rounded-xl p-5 hover:border-gray-300 transition-all shadow-sm ${
                  currentKey?.is_valid
                    ? 'border-green-200'
                    : config.required
                    ? 'border-yellow-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      currentKey?.is_valid
                        ? 'bg-green-50'
                        : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        currentKey?.is_valid
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {config.displayName}
                        {config.required && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                            Required
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                  </div>
                  {getStatusIcon(config.name)}
                </div>

                {/* Input field */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id={`api-key-${config.name}`}
                        type={isVisible ? 'text' : 'password'}
                        placeholder={config.placeholder}
                        defaultValue={currentKey?.api_key || ''}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-12 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      />
                      <button
                        onClick={() => setShowKeys({ ...showKeys, [config.name]: !isVisible })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Save/Validate Button */}
                    <button
                      onClick={() => {
                        const input = document.getElementById(`api-key-${config.name}`) as HTMLInputElement
                        if (input?.value) {
                          handleSaveKey(config.name, input.value)
                        }
                      }}
                      disabled={loading[config.name]}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading[config.name] ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Validating...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save & Validate</span>
                        </>
                      )}
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {currentKey && (
                        <button
                          onClick={() => handleVerifyKey(config.name)}
                          disabled={verifying[config.name]}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                          title="Re-verify API key"
                        >
                          <RefreshCw className={`w-4 h-4 ${verifying[config.name] ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      {currentKey && (
                        <button
                          onClick={() => handleDeleteKey(config.name)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete API key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status info */}
                  {currentKey && (
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${currentKey.is_valid ? 'text-green-400' : 'text-red-400'}`}>
                        {currentKey.is_valid ? '✓ Verified' : '✗ Invalid'}
                      </span>
                      {currentKey.last_verified_at && (
                        <span className="text-gray-500">
                          Last verified: {new Date(currentKey.last_verified_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Security note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Security Notice</p>
            <p className="text-blue-700">
              Your API keys are encrypted and stored securely in Supabase.
              They are never exposed in browser storage or transmitted unencrypted.
              Each key is verified upon saving to ensure it's valid.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}