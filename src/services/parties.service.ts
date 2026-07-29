import { supabase } from '../lib/supabase/client'

export function obtenirPartie(partieId: string) {
  return supabase.from('parties').select('grille_id, statut').eq('id', partieId).single()
}

export function existePartiePourGrille(grilleId: string) {
  return supabase.from('parties').select('id').eq('grille_id', grilleId).limit(1)
}

export function listerPartiesEnCoursParGrilles(grilleIds: string[]) {
  return supabase.from('parties').select('id, grille_id, code_partie').in('grille_id', grilleIds).eq('statut', 'en_cours')
}

export function listerPartiesEnCoursParIds(partieIds: string[]) {
  return supabase.from('parties').select('id, grille_id, code_partie').in('id', partieIds).eq('statut', 'en_cours')
}

export function creerPartie(grilleId: string) {
  return supabase.from('parties').insert({ grille_id: grilleId }).select().single()
}

// `.select()` force la représentation de la ligne modifiée : un update filtré en silence
// par RLS renverrait sinon un succès sans erreur, sans que la clôture n'ait réellement eu lieu.
export function cloturerPartie(partieId: string) {
  return supabase.from('parties').update({ statut: 'terminee' }).eq('id', partieId).select()
}

export function listerVainqueursDePartie(partieId: string) {
  return supabase.from('parties_vainqueurs').select('joueur_id').eq('partie_id', partieId).order('declared_at')
}

export function listerVainqueursParParties(partieIds: string[]) {
  return supabase.from('parties_vainqueurs').select('partie_id, joueurs(pseudo)').in('partie_id', partieIds)
}

export function rejoindrePartie(codePartie: string, pseudo: string) {
  return supabase.rpc('rejoindre_partie', { p_code_partie: codePartie, p_pseudo: pseudo })
}
