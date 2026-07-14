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

type GrilleAEditer = {
  id: string
  nom: string
  taille: number
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
  const [grilleAEditer, setGrilleAEditer] = useState<GrilleAEditer | null>(null)

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

  // Une session invité (anonyme, créée via signInAnonymously() dans RejoindrePartieScreen)
  // est traitée comme "pas de session" pour l'accès à la Bibliothèque/Création de grille —
  // ces surfaces sont réservées aux comptes permanents (FR-19). Ne jamais appeler signOut()
  // ici : détruire la session casserait la reconnexion (Story 2.6) et l'idempotence de
  // rejoindre_partie pour un invité qui reviendrait directement via le lien de sa partie.
  // `!== false` plutôt qu'un test de vérité direct : is_anonymous est typé
  // `boolean | undefined` par le SDK — échec fermé (vers AuthScreen) par défaut en cas
  // d'incertitude, plutôt qu'un échec ouvert qui laisserait passer un invité par erreur.
  if (!session || session.user.is_anonymous !== false) {
    return <AuthScreen />
  }

  if (ecran === 'creation-grille') {
    return (
      <CreationGrilleScreen
        grilleInitiale={grilleAEditer}
        onRetourBibliotheque={() => {
          setEcran('bibliotheque')
          setGrilleAEditer(null)
        }}
      />
    )
  }

  return (
    <BibliothequeScreen
      onNouvelleGrille={() => {
        setGrilleAEditer(null)
        setEcran('creation-grille')
      }}
      onModifierGrille={(grille) => {
        setGrilleAEditer(grille)
        setEcran('creation-grille')
      }}
    />
  )
}

export default App
