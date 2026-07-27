import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import { lireJoueurPersiste, persisterJoueur, type Joueur } from '../../lib/joueurStorage'
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
  const [joueurConnu] = useState<Joueur | null>(() => lireJoueurPersiste(codePartie))
  const [pseudo, setPseudo] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [etatTerminal, setEtatTerminal] = useState<EtatTerminal>(null)
  const [lienCopie, setLienCopie] = useState(false)

  const lien = construireLienPartie(codePartie)

  useEffect(() => {
    if (joueurConnu) {
      onAccederGrille(joueurConnu)
    }
    // Ne doit s'exécuter qu'au montage : `joueurConnu` est figé (useState sans setter
    // appelé), le rejouer sur un changement de référence de `onAccederGrille` (fonction
    // recréée à chaque rendu du parent) romprait l'intention "une seule fois".
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
      } = await supabase.auth.getSession()

      if (!session) {
        const { error: errorAuth } = await supabase.auth.signInAnonymously()
        if (errorAuth) {
          setMessage(friendlyErrorMessage())
          return
        }
      }

      const { data, error } = await supabase.rpc('rejoindre_partie', {
        p_code_partie: codePartie,
        p_pseudo: pseudo.trim(),
      })

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
      persisterJoueur(codePartie, nouveauJoueur)
      onAccederGrille(nouveauJoueur)
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  async function handleCopierLien() {
    try {
      await navigator.clipboard.writeText(lien)
      setLienCopie(true)
      setTimeout(() => setLienCopie(false), 2000)
    } catch {
      // Échec silencieux toléré : le lien reste affiché et copiable manuellement.
    }
  }

  // Le montage n'aura duré qu'un instant, le temps que l'effet ci-dessus délègue au
  // parent — rien à afficher, même principe que les autres écrans de l'app pendant un
  // chargement transitoire (ex. GrilleEnDirecteScreen).
  if (joueurConnu) {
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
      <Button type="button" variant="secondary" onClick={handleCopierLien}>
        {lienCopie ? 'Lien copié !' : 'Copier le lien'}
      </Button>

      {onRetour && (
        <div className="partie-active-screen__actions">
          <Button type="button" variant="secondary" onClick={onRetour}>
            Retour
          </Button>
        </div>
      )}
    </main>
  )
}
