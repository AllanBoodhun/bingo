import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.scss'
import { supabase, supabaseConfigError } from './lib/supabase/client'
import { AuthScreen } from './features/auth/AuthScreen'
import { BibliothequeScreen } from './features/bibliotheque/BibliothequeScreen'
import { CreationGrilleScreen } from './features/creation-grille/CreationGrilleScreen'
import { RejoindrePartieScreen } from './features/rejoindre-partie/RejoindrePartieScreen'
import { GrilleEnDirecteScreen } from './features/grille-en-direct/GrilleEnDirecteScreen'
import { DesignSystemScreen } from './features/design-system/DesignSystemScreen'

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

// Complète AD-5 ("la session est conservée côté client... et survit au rechargement") :
// la session Supabase Auth elle-même persiste déjà nativement en localStorage, mais le
// `joueur` retourné par `rejoindre_partie` (id/pseudo/partieId) ne vivait jusqu'ici qu'en
// mémoire React (Story 2.2, décision documentée "un rechargement de page redemandera donc
// le pseudo... assumé") — un simple rechargement de page renvoyait donc systématiquement
// vers l'écran de saisie du pseudo, même si `rejoindre_partie` restait idempotent côté
// serveur (aucun doublon créé, juste une étape confuse et inutile pour l'utilisateur).
const JOUEUR_STORAGE_PREFIX = 'bingo:joueur:'

function lireJoueurPersiste(codePartie: string): Joueur | null {
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

function persisterJoueur(codePartie: string, joueur: Joueur) {
  try {
    localStorage.setItem(JOUEUR_STORAGE_PREFIX + codePartie, JSON.stringify(joueur))
  } catch {
    // Échec silencieux toléré (ex. stockage désactivé/plein) : la saisie du pseudo
    // reste disponible comme repli à chaque rechargement, idempotente côté serveur.
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [ecran, setEcran] = useState<Ecran>('bibliotheque')
  const [codePartieRejoint] = useState<string | null>(() => lireCodePartieDepuisURL())
  const [joueurRejoint, setJoueurRejoint] = useState<Joueur | null>(() =>
    codePartieRejoint ? lireJoueurPersiste(codePartieRejoint) : null,
  )
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
      <GrilleEnDirecteScreen joueur={joueurRejoint} />
    ) : (
      <RejoindrePartieScreen
        codePartie={codePartieRejoint}
        onRejoint={(joueur) => {
          persisterJoueur(codePartieRejoint, joueur)
          setJoueurRejoint(joueur)
        }}
      />
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
