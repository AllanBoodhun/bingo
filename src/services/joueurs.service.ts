import { supabase } from '../lib/supabase/client'

export function listerJoueursDePartie(partieId: string) {
  return supabase.from('joueurs').select('id, pseudo').eq('partie_id', partieId).order('created_at')
}

export function listerPartiesRejointesParCompte(compteId: string) {
  return supabase.from('joueurs').select('partie_id').eq('compte_id', compteId)
}

// Nombre de joueurs par partie (comptage côté appelant) : ne sélectionne que `partie_id`.
export function listerJoueursParParties(partieIds: string[]) {
  return supabase.from('joueurs').select('partie_id').in('partie_id', partieIds)
}

export function obtenirCompteIdJoueur(joueurId: string) {
  return supabase.from('joueurs').select('compte_id').eq('id', joueurId).maybeSingle()
}
