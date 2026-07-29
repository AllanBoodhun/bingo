import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'

// Helpers communs, indépendants de toute entité métier — les services enfants
// (grilles.service, parties.service, ...) portent les appels spécifiques à une table.
export function creerCanal(nom: string): RealtimeChannel {
  return supabase.channel(nom)
}

export function retirerCanal(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}
