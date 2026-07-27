export type Grille = {
  id: string
  nom: string
  taille: number
  validee: boolean
}

export type PartieActive = {
  id: string
  codePartie: string
  nombreJoueurs: number
  vainqueurs: string[]
}
