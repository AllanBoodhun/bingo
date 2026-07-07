import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export let supabaseConfigError: string | null = null
let client: SupabaseClient | undefined

if (!supabaseUrl || !supabasePublishableKey) {
  supabaseConfigError =
    'VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example).'
} else {
  try {
    client = createClient(supabaseUrl, supabasePublishableKey)
  } catch {
    supabaseConfigError = 'Impossible de se connecter au serveur — vérifie ta configuration.'
  }
}

export const supabase = client as SupabaseClient
