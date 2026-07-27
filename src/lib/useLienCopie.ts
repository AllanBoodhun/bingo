import { useState } from 'react'

// Partagé entre PartieActiveScreen (avant de rejoindre) et GrilleEnDirecteScreen
// (une fois en jeu) : les deux écrans permettent de copier le lien de la partie.
export function useLienCopie() {
  const [copie, setCopie] = useState(false)

  async function copier(lien: string) {
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Échec silencieux toléré : le lien reste affiché et copiable manuellement.
    }
  }

  return { copie, copier }
}
