import { supabase } from '../lib/supabase/client'

export function listerGrilles() {
  return supabase.from('grilles').select('id, nom, taille').order('created_at', { ascending: false })
}

export function listerGrillesParIds(ids: string[]) {
  return supabase.from('grilles').select('id, nom, taille').in('id', ids)
}

export function obtenirCompteIdGrille(grilleId: string) {
  return supabase.from('grilles').select('compte_id').eq('id', grilleId).maybeSingle()
}

export function creerGrille(nom: string, taille: number) {
  return supabase.from('grilles').insert({ nom, taille }).select().single()
}

export function renommerGrille(id: string, nom: string) {
  return supabase.from('grilles').update({ nom }).eq('id', id)
}

export function changerTailleGrille(id: string, taille: number) {
  return supabase.from('grilles').update({ taille }).eq('id', id)
}

// Suppression confirmée : `.select()` force la représentation de la ligne supprimée,
// nécessaire pour distinguer une vraie suppression d'un delete filtré en silence par RLS.
export function supprimerGrille(id: string) {
  return supabase.from('grilles').delete().eq('id', id).select()
}

// Rollback best-effort (ex. échec de l'insertion des phrases après création/duplication
// de la grille) : pas de `.select()`, le résultat n'est jamais inspecté par l'appelant.
export function annulerCreationGrille(id: string) {
  return supabase.from('grilles').delete().eq('id', id)
}
