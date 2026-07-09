import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigError } from './lib/supabase/client'
import { AuthScreen } from './features/auth/AuthScreen'
import { BibliothequeScreen } from './features/bibliotheque/BibliothequeScreen'
import { CreationGrilleScreen } from './features/creation-grille/CreationGrilleScreen'
import { RejoindrePartieScreen } from './features/rejoindre-partie/RejoindrePartieScreen'
import { GrilleEnDirecteScreen } from './features/grille-en-direct/GrilleEnDirecteScreen'

type Ecran = 'bibliotheque' | 'creation-grille'

type Joueur = {
  id: string
  pseudo: string
  partieId: string
}

function lireCodePartieDepuisURL(): string | null {
  return new URLSearchParams(window.location.search).get('partie')
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [ecran, setEcran] = useState<Ecran>('bibliotheque')
  const [codePartieRejoint] = useState<string | null>(() => lireCodePartieDepuisURL())
  const [joueurRejoint, setJoueurRejoint] = useState<Joueur | null>(null)

  useEffect(() => {
    if (supabaseConfigError) {
      return
    }

    let receivedAuthEvent = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true
      setSession(nextSession)
      setLoading(false)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!receivedAuthEvent) {
          setSession(data.session)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!receivedAuthEvent) {
          setLoading(false)
        }
      })

    return () => subscription.unsubscribe()
  }, [])

  if (supabaseConfigError) {
    return <p className="config-error">{supabaseConfigError}</p>
  }

  if (codePartieRejoint !== null) {
    return joueurRejoint ? (
      <GrilleEnDirecteScreen joueur={joueurRejoint} />
    ) : (
      <RejoindrePartieScreen codePartie={codePartieRejoint} onRejoint={setJoueurRejoint} />
    )
  }

  if (loading) {
    return null
  }

  if (!session) {
    return <AuthScreen />
  }

  if (ecran === 'creation-grille') {
    return <CreationGrilleScreen onRetourBibliotheque={() => setEcran('bibliotheque')} />
  }

  return <BibliothequeScreen onNouvelleGrille={() => setEcran('creation-grille')} />
}

export default App
