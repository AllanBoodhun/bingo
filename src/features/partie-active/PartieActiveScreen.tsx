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

type PartieActiveScreenProps = {
  grilleNom: string
  codePartie: string
  onRetour: () => void
  onAccederGrille: (joueur: Joueur) => void
}

export function PartieActiveScreen({ grilleNom, codePartie, onRetour, onAccederGrille }: PartieActiveScreenProps) {
  const [joueur, setJoueur] = useState<Joueur | null>(() => lireJoueurPersiste(codePartie))
  const [pseudo, setPseudo] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [autresPseudos, setAutresPseudos] = useState<string[]>([])
  const [lienCopie, setLienCopie] = useState(false)

  const lien = construireLienPartie(codePartie)

  useEffect(() => {
    let ignore = false

    async function chargerJoueurs() {
      const { data, error } = await supabase.from('joueurs').select('id, pseudo').eq('partie_id', joueur?.partieId ?? '')

      if (ignore || error || !data) return

      setAutresPseudos(data.filter((j) => j.id !== joueur?.id).map((j) => j.pseudo))
    }

    // Nécessite un partieId connu (donc un joueur déjà inscrit, créateur ou non) : tant
    // que le créateur n'a pas encore rejoint sa propre partie, on ne connaît pas son
    // joueur.id pour filtrer "les autres" et l'appel est reporté après l'inscription.
    if (joueur) {
      chargerJoueurs()
    }

    return () => {
      ignore = true
    }
  }, [joueur])

  async function handleRejoindre(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('rejoindre_partie', {
        p_code_partie: codePartie,
        p_pseudo: pseudo.trim(),
      })

      if (error || !data) {
        setMessage(friendlyErrorMessage())
        return
      }

      const nouveauJoueur: Joueur = { id: data.id, pseudo: data.pseudo, partieId: data.partie_id }
      persisterJoueur(codePartie, nouveauJoueur)
      setJoueur(nouveauJoueur)
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

  return (
    <main className="partie-active-screen">
      <h1 className="sr-only">Partie en cours — {grilleNom}</h1>
      <p className="partie-active-screen__titre">{grilleNom}</p>

      {joueur ? (
        <div className="partie-active-screen__champ">
          <span className="partie-active-screen__label">Ton pseudo</span>
          <span className="partie-active-screen__pseudo">{joueur.pseudo}</span>
        </div>
      ) : (
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
      )}

      {message && <p className="partie-active-screen__message">{message}</p>}

      <p className="partie-active-screen__lien">{lien}</p>
      <Button type="button" variant="secondary" onClick={handleCopierLien}>
        {lienCopie ? 'Lien copié !' : 'Copier le lien'}
      </Button>

      {autresPseudos.length > 0 && (
        <div className="partie-active-screen__joueurs">
          <span className="partie-active-screen__label">Autres joueurs</span>
          <p>{autresPseudos.join(', ')}</p>
        </div>
      )}

      <div className="partie-active-screen__actions">
        {joueur && (
          <Button type="button" variant="primary" onClick={() => onAccederGrille(joueur)}>
            Accéder à la grille
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onRetour}>
          Retour
        </Button>
      </div>
    </main>
  )
}
