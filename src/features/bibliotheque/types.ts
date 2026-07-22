export type Grille = {
  id: string
  nom: string
  taille: number
  validee: boolean
}

export type PartieEnAttente = {
  id: string
  nom: string
  lien: string
}

export type PartieActive = {
  id: string
  codePartie: string
}
