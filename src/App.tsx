import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.scss'
import { supabase, supabaseConfigError } from './lib/supabase/client'
import type { Joueur } from './lib/joueurStorage'
import { AuthScreen } from './features/auth/AuthScreen'
import { BibliothequeScreen } from './features/bibliotheque/BibliothequeScreen'
import { CreationGrilleScreen } from './features/creation-grille/CreationGrilleScreen'
import { GrilleEnDirecteScreen } from './features/grille-en-direct/GrilleEnDirecteScreen'
import { PartieActiveScreen } from './features/partie-active/PartieActiveScreen'
import { DesignSystemScreen } from './features/design-system/DesignSystemScreen'
import type { Grille, PartieActive } from './features/bibliotheque/types'

type Ecran = 'bibliotheque' | 'creation-grille' | 'partie-active'

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
  const [partieActiveContexte, setPartieActiveContexte] = useState<{ grille: Grille; partie: PartieActive } | null>(
    null,
  )
  const [joueurActifInterne, setJoueurActifInterne] = useState<Joueur | null>(null)

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

  // Page interne non listée dans la navigation, réservée au travail sur le design
  // system (§Colors/Typography/Components de DESIGN.md) — accès uniquement via cette
  // URL directe, avant toute vérification Supabase pour rester utilisable hors-ligne.
  if (new URLSearchParams(window.location.search).has('design-system')) {
    return <DesignSystemScreen />
  }

  if (supabaseConfigError) {
    return <p className="config-error">{supabaseConfigError}</p>
  }

  if (codePartieRejoint !== null) {
    return joueurRejoint ? (
      <GrilleEnDirecteScreen joueur={joueurRejoint} codePartie={codePartieRejoint} />
    ) : (
      <PartieActiveScreen codePartie={codePartieRejoint} onAccederGrille={setJoueurRejoint} />
    )
  }

  if (loading) {
    return null
  }

  // Une session invité (anonyme, créée via signInAnonymously() dans PartieActiveScreen)
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
        onPartieLancee={(grille, partie) => {
          setGrilleAEditer(null)
          setPartieActiveContexte({ grille, partie })
          setEcran('partie-active')
        }}
      />
    )
  }

  if (joueurActifInterne && partieActiveContexte) {
    return (
      <GrilleEnDirecteScreen
        joueur={joueurActifInterne}
        codePartie={partieActiveContexte.partie.codePartie}
        onRetourBibliotheque={() => {
          setJoueurActifInterne(null)
          setEcran('bibliotheque')
          setPartieActiveContexte(null)
        }}
      />
    )
  }

  if (ecran === 'partie-active' && partieActiveContexte) {
    return (
      <PartieActiveScreen
        grilleNom={partieActiveContexte.grille.nom}
        codePartie={partieActiveContexte.partie.codePartie}
        onRetour={() => {
          setEcran('bibliotheque')
          setPartieActiveContexte(null)
        }}
        onAccederGrille={(joueur) => {
          setJoueurActifInterne(joueur)
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
      onRejoindrePartie={(grille, partie) => {
        setPartieActiveContexte({ grille, partie })
        setEcran('partie-active')
      }}
    />
  )
}

export default App
