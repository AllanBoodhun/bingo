import { supabase } from '../lib/supabase/client'

export function listerCasesDeJoueur(joueurId: string) {
  return supabase
    .from('cases')
    .select('id, position, checked, phrase_id, phrases(texte)')
    .eq('joueur_id', joueurId)
    .order('position')
}

// `.select()` force la représentation de la ligne modifiée : un update filtré en silence
// par RLS (ex. case déjà réassignée) renvoie un succès avec `data: []`, sans `error`.
export function mettreAJourCase(id: string, checked: boolean) {
  return supabase.from('cases').update({ checked }).eq('id', id).select()
}
