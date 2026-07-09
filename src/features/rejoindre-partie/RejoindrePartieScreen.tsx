import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './RejoindrePartieScreen.css'

type Joueur = {
  id: string
  pseudo: string
  partieId: string
}

type EtatTerminal = 'introuvable' | 'complete' | null

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

const PSEUDO_MAX_LENGTH = 40

type RejoindrePartieScreenProps = {
  codePartie: string
  onRejoint: (joueur: Joueur) => void
}

export function RejoindrePartieScreen({ codePartie, onRejoint }: RejoindrePartieScreenProps) {
  const [pseudo, setPseudo] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [etatTerminal, setEtatTerminal] = useState<EtatTerminal>(null)

  async function handleRejoindre(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
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

      onRejoint({ id: data.id, pseudo: data.pseudo, partieId: data.partie_id })
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  if (etatTerminal === 'introuvable') {
    return (
      <main className="rejoindre-partie-screen">
        <h1 className="rejoindre-partie-screen__title">bingo</h1>
        <p className="rejoindre-partie-screen__message">
          Cette Partie n'existe plus ou le lien est incorrect.
        </p>
      </main>
    )
  }

  if (etatTerminal === 'complete') {
    return (
      <main className="rejoindre-partie-screen">
        <h1 className="rejoindre-partie-screen__title">bingo</h1>
        <p className="rejoindre-partie-screen__message">
          Cette Partie est complète (6 joueurs max).
        </p>
      </main>
    )
  }

  return (
    <main className="rejoindre-partie-screen">
      <h1 className="rejoindre-partie-screen__title">bingo</h1>
      <p className="rejoindre-partie-screen__subtitle">Rejoins la Partie !</p>

      <form className="rejoindre-partie-screen__form" onSubmit={handleRejoindre}>
        <label className="rejoindre-partie-screen__label" htmlFor="pseudo">
          Ton pseudo
        </label>
        <input
          id="pseudo"
          className="rejoindre-partie-screen__input"
          type="text"
          required
          maxLength={PSEUDO_MAX_LENGTH}
          disabled={pending}
          value={pseudo}
          onChange={(event) => setPseudo(event.target.value)}
        />

        {message && <p className="rejoindre-partie-screen__message">{message}</p>}

        <Button type="submit" variant="primary" disabled={pending || !pseudo.trim()}>
          Rejoindre
        </Button>
      </form>
    </main>
  )
}
