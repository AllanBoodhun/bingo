import { useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './BibliothequeScreen.css'

/**
 * Stub d'écran — sert uniquement de cible de redirection post-connexion pour la Story 1.1.
 * La liste des grilles, le message d'invitation et la bannière de rappel arrivent en Story 1.5.
 */
type BibliothequeScreenProps = {
  onNouvelleGrille: () => void
}

export function BibliothequeScreen({ onNouvelleGrille }: BibliothequeScreenProps) {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="bibliotheque-screen">
      <h1 className="bibliotheque-screen__title">Bibliothèque</h1>
      <p className="bibliotheque-screen__subtitle">Tes grilles arriveront bientôt ici.</p>
      <Button type="button" variant="primary" onClick={onNouvelleGrille}>
        Nouvelle grille
      </Button>
      <Button type="button" variant="secondary" disabled={signingOut} onClick={handleSignOut}>
        Me déconnecter
      </Button>
    </main>
  )
}
