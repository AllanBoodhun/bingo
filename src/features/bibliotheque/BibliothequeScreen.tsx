import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './BibliothequeScreen.css'

type Grille = {
  id: string
  nom: string
  taille: number
  validee: boolean
}

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

const NOM_MAX_LENGTH = 100

function nomDeLaCopie(nomSource: string): string {
  const suffixe = ' (copie)'
  if (nomSource.length + suffixe.length <= NOM_MAX_LENGTH) {
    return `${nomSource}${suffixe}`
  }
  return `${nomSource.slice(0, NOM_MAX_LENGTH - suffixe.length)}${suffixe}`
}

type BibliothequeScreenProps = {
  onNouvelleGrille: () => void
}

export function BibliothequeScreen({ onNouvelleGrille }: BibliothequeScreenProps) {
  const [grilles, setGrilles] = useState<Grille[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dupliquantIds, setDupliquantIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let ignore = false

    setChargement(true)
    setChargementEchoue(false)
    setGrilles([])
    setMessage(null)

    async function charger() {
      try {
        const { data: grillesData, error: grillesError } = await supabase
          .from('grilles')
          .select('id, nom, taille')
          .order('created_at', { ascending: false })

        if (ignore) return

        if (grillesError || !grillesData) {
          setChargementEchoue(true)
          return
        }

        if (grillesData.length === 0) {
          setGrilles([])
          return
        }

        const ids = grillesData.map((g) => g.id)
        const { data: phrasesData, error: phrasesError } = await supabase
          .from('phrases')
          .select('grille_id')
          .in('grille_id', ids)

        if (ignore) return

        if (phrasesError || !phrasesData) {
          setChargementEchoue(true)
          return
        }

        const comptesParGrille = new Map<string, number>()
        for (const { grille_id } of phrasesData) {
          comptesParGrille.set(grille_id, (comptesParGrille.get(grille_id) ?? 0) + 1)
        }

        setGrilles(
          grillesData.map((g) => ({
            id: g.id,
            nom: g.nom,
            taille: g.taille,
            validee: (comptesParGrille.get(g.id) ?? 0) === g.taille * g.taille,
          })),
        )
      } catch {
        if (!ignore) {
          setChargementEchoue(true)
        }
      } finally {
        if (!ignore) {
          setChargement(false)
        }
      }
    }

    charger()

    return () => {
      ignore = true
    }
  }, [retry])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setSigningOut(false)
    }
  }

  async function handleDupliquer(grille: Grille) {
    setDupliquantIds((current) => new Set(current).add(grille.id))
    setMessage(null)

    let nouvelleGrilleId: string | null = null

    try {
      const { data: nouvelleGrille, error: grilleError } = await supabase
        .from('grilles')
        .insert({ nom: nomDeLaCopie(grille.nom), taille: grille.taille })
        .select()
        .single()

      if (grilleError || !nouvelleGrille) {
        setMessage(friendlyErrorMessage())
        return
      }

      nouvelleGrilleId = nouvelleGrille.id

      const { data: phrasesSource, error: phrasesError } = await supabase
        .from('phrases')
        .select('texte')
        .eq('grille_id', grille.id)

      if (phrasesError || !phrasesSource) {
        await supabase.from('grilles').delete().eq('id', nouvelleGrilleId)
        setMessage(friendlyErrorMessage())
        return
      }

      if (phrasesSource.length > 0) {
        const { error: insertError } = await supabase
          .from('phrases')
          .insert(phrasesSource.map((p) => ({ grille_id: nouvelleGrilleId, texte: p.texte })))

        if (insertError) {
          await supabase.from('grilles').delete().eq('id', nouvelleGrilleId)
          setMessage(friendlyErrorMessage())
          return
        }
      }

      setRetry((n) => n + 1)
    } catch {
      if (nouvelleGrilleId) {
        await supabase.from('grilles').delete().eq('id', nouvelleGrilleId)
      }
      setMessage(friendlyErrorMessage())
    } finally {
      setDupliquantIds((current) => {
        const next = new Set(current)
        next.delete(grille.id)
        return next
      })
    }
  }

  if (chargement) {
    return null
  }

  if (chargementEchoue) {
    return (
      <main className="bibliotheque-screen">
        <p className="bibliotheque-screen__message">{friendlyErrorMessage()}</p>
        <Button type="button" variant="primary" onClick={() => setRetry((n) => n + 1)}>
          Réessayer
        </Button>
      </main>
    )
  }

  return (
    <main className="bibliotheque-screen">
      <h1 className="bibliotheque-screen__title">Bibliothèque</h1>

      {grilles.length === 0 ? (
        <p className="bibliotheque-screen__subtitle">Crée ta première grille pour commencer !</p>
      ) : (
        <ul className="grille-list">
          {grilles.map((grille) => (
            <li key={grille.id} className="grille-list__item">
              <span className="grille-list__nom">{grille.nom}</span>
              {grille.validee && (
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Dupliquer ${grille.nom}`}
                  disabled={dupliquantIds.has(grille.id)}
                  onClick={() => handleDupliquer(grille)}
                >
                  Dupliquer
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="bibliotheque-screen__message">{message}</p>}

      <Button type="button" variant="primary" onClick={onNouvelleGrille}>
        Nouvelle grille
      </Button>
      <Button type="button" variant="secondary" disabled={signingOut} onClick={handleSignOut}>
        Me déconnecter
      </Button>
    </main>
  )
}
