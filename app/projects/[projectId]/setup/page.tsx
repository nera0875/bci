'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, CheckCircle, XCircle, AlertCircle,
  Eye, EyeOff, Loader2, ArrowRight, Key
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast, { Toaster } from 'react-hot-toast'

interface ApiKeyStatus {
  openai: { configured: boolean; valid: boolean | null }
  claude: { configured: boolean; valid: boolean | null }
  mem0: { configured: boolean; valid: boolean | null }
}

export default function ProjectSetupPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<any>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})

  // Form state
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    claude: '',
    mem0: ''
  })

  // Status state
  const [status, setStatus] = useState<ApiKeyStatus>({
    openai: { configured: false, valid: null },
    claude: { configured: false, valid: null },
    mem0: { configured: false, valid: null }
  })

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      if (!data) {
        router.push('/projects')
        return
      }

      setProject(data)

      // Charger les clés existantes
      if (data.api_keys) {
        const keys = data.api_keys
        setApiKeys({
          openai: keys.openai || '',
          claude: keys.claude || '',
          mem0: keys.mem0 || 'm0-34u8VxkLt0KQ77hRbz879jl26e5lywZcepPjlawU' // Clé par défaut fournie
        })

        // Mettre à jour le statut
        setStatus({
          openai: {
            configured: !!keys.openai,
            valid: keys.openai_valid ?? null
          },
          claude: {
            configured: !!keys.claude,
            valid: keys.claude_valid ?? null
          },
          mem0: {
            configured: !!keys.mem0,
            valid: keys.mem0_valid ?? null
          }
        })
      } else {
        // Utiliser la clé Mem0 par défaut
        setApiKeys(prev => ({
          ...prev,
          mem0: 'm0-34u8VxkLt0KQ77hRbz879jl26e5lywZcepPjlawU'
        }))
        setStatus(prev => ({
          ...prev,
          mem0: { configured: true, valid: true }
        }))
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const validateKey = async (service: string, key: string): Promise<boolean> => {
    if (!key) return false

    setValidating({ ...validating, [service]: true })

    try {
      let isValid = false

      switch (service) {
        case 'openai':
          const openaiResp = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${key}` }
          })
          isValid = openaiResp.ok
          break

        case 'claude':
          // Pour Claude, on fait un test simple
          // En production, il faudrait une vraie validation
          isValid = key.startsWith('sk-ant-') && key.length > 20
          break

        case 'mem0':
          // Test avec l'API Mem0
          const mem0Resp = await fetch('/api/memory/v5/get-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              testMode: true
            })
          })
          isValid = mem0Resp.ok
          break
      }

      // Mettre à jour le statut
      setStatus(prev => ({
        ...prev,
        [service]: { configured: true, valid: isValid }
      }))

      return isValid
    } catch (error) {
      console.error(`Error validating ${service} key:`, error)
      setStatus(prev => ({
        ...prev,
        [service]: { configured: true, valid: false }
      }))
      return false
    } finally {
      setValidating({ ...validating, [service]: false })
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Valider toutes les clés
      const validations = await Promise.all([
        validateKey('openai', apiKeys.openai),
        validateKey('claude', apiKeys.claude),
        validateKey('mem0', apiKeys.mem0)
      ])

      // Préparer les données à sauvegarder
      const apiKeysData = {
        openai: apiKeys.openai,
        claude: apiKeys.claude,
        mem0: apiKeys.mem0,
        openai_valid: validations[0],
        claude_valid: validations[1],
        mem0_valid: validations[2]
      }

      // Mettre à jour dans Supabase
      const { error } = await supabase
        .from('projects')
        .update({
          api_keys: apiKeysData,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (error) throw error

      toast.success('API keys saved successfully!')

      // Vérifier si toutes les clés requises sont valides
      const allValid = apiKeys.mem0 && validations[2] // Au minimum Mem0 est requis

      if (allValid) {
        setTimeout(() => {
          router.push(`/chat/${projectId}`)
        }, 1500)
      }
    } catch (error) {
      console.error('Error saving keys:', error)
      toast.error('Failed to save API keys')
    } finally {
      setSaving(false)
    }
  }

  const getStatusIcon = (service: string) => {
    const serviceStatus = status[service as keyof ApiKeyStatus]

    if (!serviceStatus.configured) {
      return <AlertCircle className="w-5 h-5 text-gray-400" />
    }

    if (validating[service]) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    }

    if (serviceStatus.valid === true) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }

    if (serviceStatus.valid === false) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }

    return <AlertCircle className="w-5 h-5 text-yellow-500" />
  }

  const getStatusText = (service: string) => {
    const serviceStatus = status[service as keyof ApiKeyStatus]

    if (!serviceStatus.configured) {
      return 'Not configured'
    }

    if (validating[service]) {
      return 'Validating...'
    }

    if (serviceStatus.valid === true) {
      return 'Connected'
    }

    if (serviceStatus.valid === false) {
      return 'Invalid key'
    }

    return 'Not verified'
  }

  const canAccessChat = () => {
    // Au minimum, Mem0 doit être configuré et valide
    return status.mem0.configured && status.mem0.valid === true
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/projects')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Setup {project?.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your API keys to start using the project
                </p>
              </div>
            </div>

            {canAccessChat() && (
              <button
                onClick={() => router.push(`/chat/${projectId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Go to Chat
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-600" />
              API Keys Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your API keys below. At minimum, Mem0 is required.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* OpenAI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🤖 OpenAI API Key
                  {getStatusIcon('openai')}
                </label>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  status.openai.valid === true
                    ? 'bg-green-100 text-green-700'
                    : status.openai.valid === false
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusText('openai')}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKeys['openai'] ? 'text' : 'password'}
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    onClick={() => setShowKeys({ ...showKeys, openai: !showKeys['openai'] })}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => validateKey('openai', apiKeys.openai)}
                  disabled={!apiKeys.openai || validating['openai']}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Claude */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🧠 Claude API Key
                  {getStatusIcon('claude')}
                </label>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  status.claude.valid === true
                    ? 'bg-green-100 text-green-700'
                    : status.claude.valid === false
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusText('claude')}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKeys['claude'] ? 'text' : 'password'}
                    value={apiKeys.claude}
                    onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    onClick={() => setShowKeys({ ...showKeys, claude: !showKeys['claude'] })}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showKeys['claude'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => validateKey('claude', apiKeys.claude)}
                  disabled={!apiKeys.claude || validating['claude']}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Mem0 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  💾 Mem0 API Key
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Required</span>
                  {getStatusIcon('mem0')}
                </label>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  status.mem0.valid === true
                    ? 'bg-green-100 text-green-700'
                    : status.mem0.valid === false
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusText('mem0')}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKeys['mem0'] ? 'text' : 'password'}
                    value={apiKeys.mem0}
                    onChange={(e) => setApiKeys({ ...apiKeys, mem0: e.target.value })}
                    placeholder="m0-..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    onClick={() => setShowKeys({ ...showKeys, mem0: !showKeys['mem0'] })}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showKeys['mem0'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => validateKey('mem0', apiKeys.mem0)}
                  disabled={!apiKeys.mem0 || validating['mem0']}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {canAccessChat() ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Ready to use the project
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    Configure Mem0 API key to continue
                  </span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || (!apiKeys.openai && !apiKeys.claude && !apiKeys.mem0)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  saving || (!apiKeys.openai && !apiKeys.claude && !apiKeys.mem0)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Setup Guide</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Enter your API keys above (Mem0 is required)</li>
            <li>• Click "Test" to validate each key</li>
            <li>• Click "Save Configuration" to save your keys</li>
            <li>• Once saved, you can access the project chat</li>
          </ul>
        </div>
      </main>
    </div>
  )
}