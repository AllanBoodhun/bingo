import { supabase } from '../lib/supabase/client'

export function listerPhrasesDeGrille(grilleId: string) {
  return supabase.from('phrases').select('id, texte').eq('grille_id', grilleId).order('created_at')
}

export function listerTextesPhrases(grilleId: string) {
  return supabase.from('phrases').select('texte').eq('grille_id', grilleId)
}

// Utilisé pour compter les phrases déjà saisies par grille (Bibliothèque) — ne sélectionne
// que `grille_id`, jamais le texte.
export function listerGrilleIdsDesPhrases(grilleIds: string[]) {
  return supabase.from('phrases').select('grille_id').in('grille_id', grilleIds)
}

export function creerPhrase(grilleId: string, texte: string) {
  return supabase.from('phrases').insert({ grille_id: grilleId, texte }).select().single()
}

export function creerPhrases(items: Array<{ grille_id: string; texte: string }>) {
  return supabase.from('phrases').insert(items)
}

export function modifierPhrase(id: string, texte: string) {
  return supabase.from('phrases').update({ texte }).eq('id', id)
}

// `.select()` force la représentation de la ligne supprimée : distingue une vraie
// suppression d'un delete filtré en silence par RLS ou refusé par un trigger de verrouillage.
export function supprimerPhrase(id: string) {
  return supabase.from('phrases').delete().eq('id', id).select()
}
