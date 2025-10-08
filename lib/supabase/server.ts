import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Creates a Supabase client for server-side operations
 * Uses service key for elevated privileges in API routes
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }

  // Use service key for API routes, fallback to anon key
  const supabaseKey = supabaseServiceKey || supabaseAnonKey

  if (!supabaseKey) {
    throw new Error('Neither SUPABASE_SERVICE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is defined')
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
