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

// Bug corrigé (2026-07-29) : un joueur qui rejoint anonymement puis se connecte à un
// compte réel change d'`auth_user_id` (Supabase émet un nouvel utilisateur, jamais une
// migration de l'ancien anonyme vers le compte). L'ancien `joueur` persisté ici restait
// pourtant lu tel quel : RLS bloque alors silencieusement toutes les lectures pour la
// nouvelle identité (aucune ligne `joueurs` ne matche `auth.uid()`), écran d'erreur qui
// boucle. `authUserId` scope désormais la validité de l'entrée à l'identité qui l'a
// écrite — un mismatch retombe sur `null`, donc sur le flux normal (formulaire pseudo +
// `rejoindre_partie`, idempotent), jamais sur une erreur visible.
type JoueurPersiste = Joueur & { authUserId: string }

export function lireJoueurPersiste(codePartie: string, authUserId: string): Joueur | null {
  try {
    const brut = localStorage.getItem(JOUEUR_STORAGE_PREFIX + codePartie)
    if (!brut) return null
    const valeur = JSON.parse(brut) as Partial<JoueurPersiste>
    if (
      typeof valeur.id === 'string' &&
      typeof valeur.pseudo === 'string' &&
      typeof valeur.partieId === 'string' &&
      valeur.authUserId === authUserId
    ) {
      return { id: valeur.id, pseudo: valeur.pseudo, partieId: valeur.partieId }
    }
    return null
  } catch {
    return null
  }
}

export function persisterJoueur(codePartie: string, joueur: Joueur, authUserId: string) {
  try {
    const aEcrire: JoueurPersiste = { ...joueur, authUserId }
    localStorage.setItem(JOUEUR_STORAGE_PREFIX + codePartie, JSON.stringify(aEcrire))
  } catch {
    // Échec silencieux toléré (ex. stockage désactivé/plein) : la saisie du pseudo
    // reste disponible comme repli à chaque rechargement, idempotente côté serveur.
  }
}
