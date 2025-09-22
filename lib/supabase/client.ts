import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client pour le navigateur
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// For server-side operations requiring elevated privileges
export const createServerClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}