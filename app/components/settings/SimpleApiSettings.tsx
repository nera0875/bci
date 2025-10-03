'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function SimpleApiSettings() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setAnthropicKey(data.anthropic_key || '')
      setOpenaiKey(data.openai_key || '')
    }
  }

  const saveApiKeys = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('api_keys')
        .upsert({
          id: '1',
          anthropic_key: anthropicKey,
          openai_key: openaiKey,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Clés API sauvegardées')
    } catch (error: any) {
      toast.error('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Configuration API</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Clé API Anthropic (Claude)
            </label>
            <Input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Clé API OpenAI (Embeddings)
            </label>
            <Input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <Button onClick={saveApiKeys} disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  )
}