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

// Nettoie les lignes `joueurs` d'une identité invitée (anonyme) qui vient de se
// transformer en compte réel (AuthScreen.tsx, après un signUp/signInWithPassword
// réussi) : le client principal a déjà basculé vers la nouvelle identité à ce
// moment-là et ne peut plus lui-même satisfaire la policy RLS `auth_user_id =
// auth.uid()` pour l'ancienne ligne — un client Supabase temporaire, authentifié
// avec le jeton de l'ANCIENNE session (capturé par l'appelant avant le switch, sa
// validité ne dépend pas du succès de l'appel de connexion/inscription), est le
// seul moyen de prouver cette ancienne identité pour l'auto-suppression. Échec
// silencieux toléré : nettoyage best-effort, ne doit jamais faire échouer la
// connexion/inscription elle-même.
export async function nettoyerJoueursInvite(ancienneSession: {
  access_token: string
  refresh_token: string
  user: { id: string }
}): Promise<void> {
  if (!supabaseUrl || !supabasePublishableKey) return
  try {
    const clientTemporaire = createClient(supabaseUrl, supabasePublishableKey)
    await clientTemporaire.auth.setSession({
      access_token: ancienneSession.access_token,
      refresh_token: ancienneSession.refresh_token,
    })
    await clientTemporaire.from('joueurs').delete().eq('auth_user_id', ancienneSession.user.id)
  } catch {
    // Best-effort : voir commentaire ci-dessus.
  }
}
