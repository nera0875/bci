import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client pour le navigateur
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// For server-side operations requiring elevated privileges
export const createServerClient = () => {
  // Use anon key if service key is not available
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey
  return createClient<Database>(supabaseUrl, supabaseKey)
}