'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle, Key, RefreshCw } from 'lucide-react'

export default function SimpleApiSettings() {
  const [envStatus, setEnvStatus] = useState({
    anthropic: false,
    openai: false,
    supabase: false
  })
  const [showEditor, setShowEditor] = useState(false)
  const [envContent, setEnvContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check if environment variables are configured
    checkEnvStatus()
  }, [])

  const checkEnvStatus = async () => {
    try {
      // Simple check endpoint
      const response = await fetch('/api/env')
      if (response.ok) {
        const data = await response.json()
        setEnvStatus(data.status || {})
        setEnvContent(data.envContent || getDefaultEnvContent())
      }
    } catch (error) {
      console.log('Env check failed, using defaults')
      setEnvContent(getDefaultEnvContent())
    }
  }

  const getDefaultEnvContent = () => {
    return `# BCI Tool - Environment Variables Clean
# Cleaned version without Mem0

# ==============================================
# SUPABASE (Votre infrastructure principale) 
# ==============================================
NEXT_PUBLIC_SUPABASE_URL=https://clcpszhztwfhnvirexao.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3Bzemh6dHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzY1NDIsImV4cCI6MjA3MTQ1MjU0Mn0.PWnQqh6lKQKKO8-9_GoyzWxKLNVxWsVWoZ-fdMPb2HA

# Service key pour opérations serveur (optionnel)
SUPABASE_SERVICE_KEY=your_service_key_here

# ==============================================
# AI PROVIDERS (À AJOUTER - REQUIS pour le chat)
# ==============================================

# Claude/Anthropic - Pour le chat IA principal
# Obtenez votre clé ici: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE

# OpenAI - Pour les embeddings et recherche sémantique  
# Obtenez votre clé ici: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE

# ==============================================
# CONFIGURATION
# ==============================================
NODE_ENV=development

# ==============================================
# ANCIEN SYSTÈME MEM0 (SUPPRIMÉ - NE PLUS UTILISER)
# ==============================================
# Ces clés ne sont plus utilisées depuis le retour à Supabase pur
# MEM0_API_KEY=...
# MEM0_PROJECT_ID=...
# MEM0_ORG_ID=...`
  }

  const saveEnvFile = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envContent })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ .env.local saved! Please restart the server to apply changes.')
        setShowEditor(false)
        // Refresh status after save
        setTimeout(checkEnvStatus, 1000)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setMessage('❌ Failed to save .env.local file')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">API Configuration</h2>
        <p className="text-gray-600">
          Configure your API keys for optimal AI performance. 
          <strong> Recommended: Use .env.local file for security.</strong>
        </p>
      </div>

      {/* Environment Variables Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          Recommended Setup (.env.local)
        </h3>
        
        <div className="space-y-4">
          <div className="font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg">
            <div># Add these to your .env.local file:</div>
            <div className="mt-2 space-y-1">
              <div>ANTHROPIC_API_KEY=sk-ant-...</div>
              <div>OPENAI_API_KEY=sk-proj-...</div>
              <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
              <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...</div>
            </div>
          </div>
          
          <div className="text-sm text-blue-800">
            💡 <strong>Why .env.local?</strong> More secure, no database storage, works immediately.
          </div>
        </div>
      </div>

      {/* Status Check */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Status</h3>
        
        <div className="space-y-4">
          {[
            { key: 'anthropic', name: 'Claude (Anthropic)', desc: 'For AI chat responses' },
            { key: 'openai', name: 'OpenAI', desc: 'For embeddings and semantic search' },
            { key: 'supabase', name: 'Supabase', desc: 'Database and memory storage' }
          ].map(({ key, name, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{name}</h4>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {envStatus[key as keyof typeof envStatus] ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-600 font-medium">Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <span className="text-orange-600 font-medium">Missing</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Setup Guide */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Quick Setup Guide:</h4>
          <ol className="text-sm text-gray-700 space-y-1">
            <li>1. Create a <code className="bg-gray-200 px-1 rounded">.env.local</code> file in your project root</li>
            <li>2. Add the API keys shown above</li>
            <li>3. Restart your development server</li>
            <li>4. Refresh this page to see updated status</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={checkEnvStatus}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Check Status
          </button>
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Key className="w-4 h-4" />
            {showEditor ? 'Hide Editor' : 'Edit .env.local'}
          </button>
        </div>
      </div>

      {/* .env.local Editor */}
      {showEditor && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit .env.local File</h3>
          
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <textarea
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="# Add your environment variables here..."
            />
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                💡 <strong>Tip:</strong> Changes require a server restart to take effect
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEnvFile}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save .env.local'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced: Database Storage (Optional) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Why .env.local is Perfect</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-green-600">✅ Advantages:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Secure:</strong> Never committed to git</li>
              <li>• <strong>Fast:</strong> No database calls</li>
              <li>• <strong>Simple:</strong> Standard practice</li>
              <li>• <strong>Reliable:</strong> No network dependencies</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-600">📚 Resources:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <a href="https://console.anthropic.com/" target="_blank" className="text-blue-600 hover:underline">Get Anthropic Key</a></li>
              <li>• <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">Get OpenAI Key</a></li>
              <li>• <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 hover:underline">Get Supabase Keys</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
