export type Joueur = {
  id: string
  pseudo: string
  partieId: string
}

// Complète AD-5 ("la session est conservée côté client... et survit au rechargement") :
// la session Supabase Auth elle-même persiste déjà nativement en localStorage, mais le
// `joueur` retourné par `rejoindre_partie` (id/pseudo/partieId) ne vivait jusqu'ici qu'en
// mémoire React (Story 2.2, décision documentée "un rechargement de page redemandera donc
// le pseudo... assumé") — un simple rechargement de page renvoyait donc systématiquement
// vers l'écran de saisie du pseudo, même si `rejoindre_partie` restait idempotent côté
// serveur (aucun doublon créé, juste une étape confuse et inutile pour l'utilisateur).
const JOUEUR_STORAGE_PREFIX = 'bingo:joueur:'

export function lireJoueurPersiste(codePartie: string): Joueur | null {
  try {
    const brut = localStorage.getItem(JOUEUR_STORAGE_PREFIX + codePartie)
    if (!brut) return null
    const valeur = JSON.parse(brut) as Partial<Joueur>
    if (typeof valeur.id === 'string' && typeof valeur.pseudo === 'string' && typeof valeur.partieId === 'string') {
      return { id: valeur.id, pseudo: valeur.pseudo, partieId: valeur.partieId }
    }
    return null
  } catch {
    return null
  }
}

export function persisterJoueur(codePartie: string, joueur: Joueur) {
  try {
    localStorage.setItem(JOUEUR_STORAGE_PREFIX + codePartie, JSON.stringify(joueur))
  } catch {
    // Échec silencieux toléré (ex. stockage désactivé/plein) : la saisie du pseudo
    // reste disponible comme repli à chaque rechargement, idempotente côté serveur.
  }
}
