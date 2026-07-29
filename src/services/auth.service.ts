import { supabase } from '../lib/supabase/client'

export { nettoyerJoueursInvite } from '../lib/supabase/client'

export function obtenirSession() {
  return supabase.auth.getSession()
}

export function ecouterChangementsAuth(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback)
}

export function inscrire(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function connecter(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function connecterAnonyme() {
  return supabase.auth.signInAnonymously()
}

export function deconnecter() {
  return supabase.auth.signOut()
}
