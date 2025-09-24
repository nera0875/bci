import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance to prevent multiple client creations
let supabaseInstance: SupabaseClient | null = null

export interface ApiKey {
  id?: string
  service_name: string
  api_key: string
  is_valid: boolean
  last_verified_at?: string
  metadata?: any
}

export interface ApiKeyService {
  getAll(): Promise<ApiKey[]>
  get(serviceName: string): Promise<ApiKey | null>
  save(serviceName: string, apiKey: string, metadata?: any): Promise<ApiKey>
  verify(serviceName: string): Promise<boolean>
  delete(serviceName: string): Promise<void>
}

export class SupabaseApiKeyService implements ApiKeyService {
  private supabase: SupabaseClient
  private userId: string | null = null

  constructor(supabaseUrl: string, supabaseKey: string) {
    // Use singleton pattern to avoid multiple instances
    if (!supabaseInstance) {
      supabaseInstance = createClient(supabaseUrl, supabaseKey)
    }
    this.supabase = supabaseInstance
    this.initUser()
  }

  private async initUser() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      this.userId = user?.id || null
    } catch (error) {
      // Silent fail - will use anonymous
      this.userId = null
    }
  }

  private encrypt(text: string): string {
    // Simple base64 encoding for now - in production use proper encryption
    return Buffer.from(text).toString('base64')
  }

  private decrypt(text: string): string {
    return Buffer.from(text, 'base64').toString('utf-8')
  }

  async getAll(): Promise<ApiKey[]> {
    try {
      if (!this.userId) await this.initUser()

      const { data, error } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', this.userId || 'anonymous')
        .order('service_name')

      if (error) {
        // If table doesn't exist or permission denied, return empty array silently
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return []
        }
        console.warn('Error fetching API keys:', error.message)
        return []
      }

      return (data || []).map((key: any) => ({
        ...key,
        api_key: key.api_key ? this.decrypt(key.api_key) : ''
      }))
    } catch (err) {
      console.warn('Failed to fetch API keys:', err)
      return []
    }
  }

  async get(serviceName: string): Promise<ApiKey | null> {
    if (!this.userId) await this.initUser()

    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', this.userId || 'anonymous')
      .eq('service_name', serviceName)
      .single()

    if (error || !data) {
      return null
    }

    return {
      ...data,
      api_key: this.decrypt(data.api_key)
    }
  }

  async save(serviceName: string, apiKey: string, metadata?: any): Promise<ApiKey> {
    if (!this.userId) await this.initUser()

    const encryptedKey = this.encrypt(apiKey)
    const isValid = await this.verifyApiKey(serviceName, apiKey)

    const { data, error } = await this.supabase
      .from('api_keys')
      .upsert({
        user_id: this.userId || 'anonymous',
        service_name: serviceName,
        api_key: encryptedKey,
        is_valid: isValid,
        last_verified_at: isValid ? new Date().toISOString() : null,
        metadata: metadata || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,service_name'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving API key:', error)
      throw error
    }

    return {
      ...data,
      api_key: apiKey
    }
  }

  async verify(serviceName: string): Promise<boolean> {
    const apiKey = await this.get(serviceName)
    if (!apiKey) return false

    const isValid = await this.verifyApiKey(serviceName, apiKey.api_key)

    // Update verification status
    await this.supabase
      .from('api_keys')
      .update({
        is_valid: isValid,
        last_verified_at: isValid ? new Date().toISOString() : null
      })
      .eq('user_id', this.userId || 'anonymous')
      .eq('service_name', serviceName)

    return isValid
  }

  async delete(serviceName: string): Promise<void> {
    if (!this.userId) await this.initUser()

    await this.supabase
      .from('api_keys')
      .delete()
      .eq('user_id', this.userId || 'anonymous')
      .eq('service_name', serviceName)
  }

  private async verifyApiKey(serviceName: string, apiKey: string): Promise<boolean> {
    try {
      // Use server-side API route to avoid CORS issues
      const response = await fetch('/api/verify-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceName,
          apiKey
        })
      })

      if (!response.ok) {
        console.error(`API verification request failed:`, response.status)
        return false
      }

      const result = await response.json()
      return result.isValid || false

    } catch (error) {
      console.error(`Error verifying ${serviceName} API key:`, error)
      return false
    }
  }
}