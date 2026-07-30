// Fichier séparé (plutôt qu'un export depuis CreationGrilleScreen.tsx) : un module qui ne
// mélange que des constantes évite de casser le Fast Refresh de React (qui exige des
// fichiers "composant uniquement" pour le hot-reload) et permet de le réutiliser depuis
// BibliothequeScreen.tsx sans coupler deux écrans entre eux via un fichier composant.
export const TEXTE_MAX_LENGTH = 50;

export const MESSAGE_PHRASE_TROP_LONGUE = `Cette grille contient une phrase de plus de ${TEXTE_MAX_LENGTH} caractères, modifie-la avant de la dupliquer.`;

// `NOT VALID` sur la contrainte SQL n'exempte que les lignes déjà en base : un INSERT
// (donc une duplication) reste toujours validé. Utilisé pour bloquer une duplication
// avant même de tenter l'appel réseau, avec le même seuil que la contrainte SQL.
export function contientPhraseTropLongue(phrases: { texte: string }[]): boolean {
  return phrases.some((p) => p.texte.length > TEXTE_MAX_LENGTH);
}

// SQLSTATE 23514 (violation CHECK) est stable, contrairement au texte de `error.message`
// (qui peut varier selon la locale ou une future version de Postgres).
export function estErreurLongueurPhrase(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23514";
}
