import { useEffect, useState, type FormEvent } from 'react'
import { obtenirSession, connecterAnonyme } from '../../services/auth.service'
import { rejoindrePartie } from '../../services/parties.service'
import { Button } from '../../components/Button'
import { lireJoueurPersiste, persisterJoueur, type Joueur } from '../../lib/joueurStorage'
import { useLienCopie } from '../../lib/useLienCopie'
import { construireLienPartie } from '../bibliotheque/utils'
import './PartieActiveScreen.scss'

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

const PSEUDO_MAX_LENGTH = 40

type EtatTerminal = 'introuvable' | 'complete' | null

type PartieActiveScreenProps = {
  codePartie: string
  // Connu côté client sans requête pour le créateur (Bibliothèque, création de grille) —
  // jamais accessible pour un invité qui rejoint via lien : RLS n'autorise la lecture de
  // `grilles` qu'au créateur (policy "Créateur lit ses grilles"). Absent, l'écran affiche
  // un titre générique plutôt que d'échouer une requête vouée à ne renvoyer aucune ligne.
  grilleNom?: string
  // Absent pour un invité arrivé via lien de partie : il n'y a pas de Bibliothèque vers
  // laquelle revenir.
  onRetour?: () => void
  onAccederGrille: (joueur: Joueur) => void
}

export function PartieActiveScreen({ codePartie, grilleNom, onRetour, onAccederGrille }: PartieActiveScreenProps) {
  // Un joueur déjà inscrit (localStorage, Story 2.6) n'a plus rien à faire sur cet écran :
  // le formulaire pseudo n'a de sens qu'une seule fois, avant l'inscription. Le réafficher
  // avec un second bouton "Accéder à la grille" créait l'impression de deux écrans
  // successifs pour une seule action logique — inscription et entrée en jeu sont fusionnées
  // ci-dessous, ce cas ne fait donc que sauter directement dans la grille.
  //
  // La lecture localStorage est désormais asynchrone (`getSession()` d'abord) car
  // l'entrée persistée n'est valide que pour l'`auth_user_id` qui l'a écrite (bug
  // anonyme→compte) : un joueur qui a rejoint anonymement puis s'est connecté à un
  // compte réel a changé d'identité, l'ancienne entrée doit être ignorée et non
  // rejouée en confiance — `verificationEnCours` couvre cette fenêtre (return null,
  // même convention que le chargement de GrilleEnDirecteScreen).
  const [verificationEnCours, setVerificationEnCours] = useState(true)
  const [joueurConnu, setJoueurConnu] = useState<Joueur | null>(null)
  const [pseudo, setPseudo] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [etatTerminal, setEtatTerminal] = useState<EtatTerminal>(null)
  const { copie: lienCopie, copier: copierLien } = useLienCopie()

  const lien = construireLienPartie(codePartie)

  useEffect(() => {
    let ignore = false

    async function verifierIdentite() {
      try {
        const {
          data: { session },
        } = await obtenirSession()
        if (ignore) return

        // Pas de session du tout : premier visiteur, aucune entrée ne peut lui
        // correspondre — inutile de tenter la lecture, le formulaire pseudo s'affiche.
        const trouve = session ? lireJoueurPersiste(codePartie, session.user.id) : null
        if (trouve) {
          setJoueurConnu(trouve)
          onAccederGrille(trouve)
        }
      } catch {
        // Échec de `getSession()` (rare, ex. jeton corrompu) : retomber sur le
        // formulaire pseudo normal plutôt que de rester bloqué indéfiniment sur un
        // écran vide — même principe d'échec sûr que le reste de cet écran.
      } finally {
        if (!ignore) {
          setVerificationEnCours(false)
        }
      }
    }

    verifierIdentite()

    return () => {
      ignore = true
    }
    // Ne doit s'exécuter qu'au montage : `codePartie` est stable pour la durée de vie
    // de cet écran, le rejouer sur un changement de référence de `onAccederGrille`
    // (fonction recréée à chaque rendu du parent) romprait l'intention "une seule fois".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRejoindre(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      // Un invité arrivé via lien de partie n'a encore aucune session : `rejoindre_partie`
      // n'est accordée qu'à `authenticated`, jamais à `anon` (Story 2.2) — sans ce
      // fallback, son premier essai échouerait toujours. Un créateur ou un joueur déjà
      // authentifié a déjà une session ici, cette branche ne s'exécute alors jamais.
      const {
        data: { session },
      } = await obtenirSession()

      // L'identité définitive à persister : celle de la session existante si présente,
      // sinon celle que `signInAnonymously()` vient de créer — jamais une valeur
      // supposée, pour que la prochaine lecture (`lireJoueurPersiste`) puisse la
      // comparer strictement et détecter un futur changement d'identité (anonyme→compte).
      let authUserId: string
      if (session) {
        authUserId = session.user.id
      } else {
        const { data: authData, error: errorAuth } = await connecterAnonyme()
        if (errorAuth || !authData.session) {
          setMessage(friendlyErrorMessage())
          return
        }
        authUserId = authData.session.user.id
      }

      const { data, error } = await rejoindrePartie(codePartie, pseudo.trim())

      if (error || !data) {
        if (/partie_introuvable/.test(error?.message ?? '')) {
          setEtatTerminal('introuvable')
        } else if (/partie_complete/.test(error?.message ?? '')) {
          setEtatTerminal('complete')
        } else {
          setMessage(friendlyErrorMessage())
        }
        return
      }

      const nouveauJoueur: Joueur = { id: data.id, pseudo: data.pseudo, partieId: data.partie_id }
      persisterJoueur(codePartie, nouveauJoueur, authUserId)
      onAccederGrille(nouveauJoueur)
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  // Rien à afficher pendant la vérification d'identité (asynchrone désormais), ni si
  // elle a abouti à un joueur connu — le montage n'aura duré qu'un instant, le temps
  // que l'effet ci-dessus délègue au parent, même principe que les autres écrans de
  // l'app pendant un chargement transitoire (ex. GrilleEnDirecteScreen).
  if (verificationEnCours || joueurConnu) {
    return null
  }

  if (etatTerminal === 'introuvable') {
    return (
      <main className="partie-active-screen">
        <h1 className="sr-only">bingo</h1>
        <p className="partie-active-screen__message">Cette Partie n'existe plus ou le lien est incorrect.</p>
      </main>
    )
  }

  if (etatTerminal === 'complete') {
    return (
      <main className="partie-active-screen">
        <h1 className="sr-only">bingo</h1>
        <p className="partie-active-screen__message">Cette Partie est complète (6 joueurs max).</p>
      </main>
    )
  }

  return (
    <main className="partie-active-screen">
      <h1 className="sr-only">Partie en cours{grilleNom ? ` — ${grilleNom}` : ''}</h1>
      <p className="partie-active-screen__titre">{grilleNom ?? 'Rejoins la Partie !'}</p>

      <form className="partie-active-screen__form" onSubmit={handleRejoindre}>
        <label className="partie-active-screen__label" htmlFor="pseudo">
          Ton pseudo
        </label>
        <input
          id="pseudo"
          className="partie-active-screen__input"
          type="text"
          required
          maxLength={PSEUDO_MAX_LENGTH}
          disabled={pending}
          value={pseudo}
          onChange={(event) => setPseudo(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={pending || !pseudo.trim()}>
          Rejoindre
        </Button>
      </form>

      {message && <p className="partie-active-screen__message">{message}</p>}

      <p className="partie-active-screen__lien">{lien}</p>
      <Button type="button" variant="secondary" color="outlinedWhite" onClick={() => copierLien(lien)}>
        {lienCopie ? 'Lien copié !' : 'Copier le lien'}
      </Button>

      {onRetour && (
        <div className="partie-active-screen__actions">
          <Button type="button" variant="secondary" color="filledBlack" onClick={onRetour}>
            Retour
          </Button>
        </div>
      )}
    </main>
  )
}
