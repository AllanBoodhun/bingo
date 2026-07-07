import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './CreationGrilleScreen.css'

type Grille = {
  id: string
  nom: string
  taille: number
}

type Phrase = {
  id: string
  texte: string
}

const TAILLES = [3, 4, 5, 6, 7, 8]

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

type CreationGrilleScreenProps = {
  onRetourBibliotheque: () => void
}

export function CreationGrilleScreen({ onRetourBibliotheque }: CreationGrilleScreenProps) {
  const [grille, setGrille] = useState<Grille | null>(null)

  return grille ? (
    <ComposerPhrases grille={grille} onRetourBibliotheque={onRetourBibliotheque} />
  ) : (
    <NouvelleGrilleForm onCreated={setGrille} onRetourBibliotheque={onRetourBibliotheque} />
  )
}

type NouvelleGrilleFormProps = {
  onCreated: (grille: Grille) => void
  onRetourBibliotheque: () => void
}

const NOM_MAX_LENGTH = 100

function NouvelleGrilleForm({ onCreated, onRetourBibliotheque }: NouvelleGrilleFormProps) {
  const [nom, setNom] = useState('')
  const [taille, setTaille] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!taille) return

    setPending(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('grilles')
        .insert({ nom: nom.trim(), taille })
        .select()
        .single()

      if (error || !data) {
        setMessage(friendlyErrorMessage())
        return
      }

      onCreated({ id: data.id, nom: data.nom, taille: data.taille })
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="creation-grille-screen">
      <h1 className="creation-grille-screen__title">Nouvelle grille</h1>

      <form className="creation-grille-screen__form" onSubmit={handleSubmit}>
        <label className="creation-grille-screen__label" htmlFor="nom">
          Nom de la grille
        </label>
        <input
          id="nom"
          className="creation-grille-screen__input"
          type="text"
          required
          maxLength={NOM_MAX_LENGTH}
          disabled={pending}
          value={nom}
          onChange={(event) => setNom(event.target.value)}
        />

        <span className="creation-grille-screen__label">Taille</span>
        <div className="size-chips">
          {TAILLES.map((n) => (
            <button
              key={n}
              type="button"
              className={['size-chip', taille === n ? 'size-chip--active' : ''].filter(Boolean).join(' ')}
              aria-pressed={taille === n}
              disabled={pending}
              onClick={() => setTaille(n)}
            >
              {n}×{n} - {n*n} phrases
            </button>
          ))}
        </div>

        {message && <p className="creation-grille-screen__message">{message}</p>}

        <Button type="submit" variant="primary" disabled={pending || !taille || !nom.trim()}>
          Créer la grille
        </Button>
      </form>

      <Button type="button" variant="secondary" disabled={pending} onClick={onRetourBibliotheque}>
        Retour à la Bibliothèque
      </Button>
    </main>
  )
}

type ComposerPhrasesProps = {
  grille: Grille
  onRetourBibliotheque: () => void
}

const TEXTE_MAX_LENGTH = 200

function ComposerPhrases({ grille, onRetourBibliotheque }: ComposerPhrasesProps) {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [nouvellePhrase, setNouvellePhrase] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTexte, setEditingTexte] = useState('')

  const total = grille.taille * grille.taille
  const complete = phrases.length === total

  async function handleAjouter(event: FormEvent) {
    event.preventDefault()
    const texte = nouvellePhrase.trim()
    if (!texte) return

    setPending(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('phrases')
        .insert({ grille_id: grille.id, texte })
        .select()
        .single()

      if (error || !data) {
        setMessage(friendlyErrorMessage())
        return
      }

      setPhrases((current) => [...current, { id: data.id, texte: data.texte }])
      setNouvellePhrase('')
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  function startEdit(phrase: Phrase) {
    setEditingId(phrase.id)
    setEditingTexte(phrase.texte)
  }

  async function saveEdit(id: string) {
    const texte = editingTexte.trim()
    if (!texte) {
      setEditingId((current) => (current === id ? null : current))
      return
    }

    setPending(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('phrases').update({ texte }).eq('id', id)
      if (error) {
        setMessage(friendlyErrorMessage())
        return
      }
      setPhrases((current) => current.map((p) => (p.id === id ? { ...p, texte } : p)))
      setEditingId((current) => (current === id ? null : current))
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="creation-grille-screen">
      <h1 className="creation-grille-screen__title">{grille.nom}</h1>
      <p className="creation-grille-screen__counter">
        {phrases.length} / {total}
      </p>
      {complete && <p className="creation-grille-screen__complete">Ta grille est complète !</p>}
      {message && <p className="creation-grille-screen__message">{message}</p>}

      <ul className="phrase-list">
        {phrases.map((phrase) =>
          editingId === phrase.id ? (
            <li key={phrase.id} className="phrase-list__item phrase-list__item--editing">
              <input
                className="creation-grille-screen__input"
                autoFocus
                maxLength={TEXTE_MAX_LENGTH}
                disabled={pending}
                value={editingTexte}
                onChange={(event) => setEditingTexte(event.target.value)}
                onBlur={() => saveEdit(phrase.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                }}
              />
            </li>
          ) : (
            <li
              key={phrase.id}
              className="phrase-list__item"
              onClick={() => startEdit(phrase)}
            >
              {phrase.texte}
            </li>
          ),
        )}
      </ul>

      {!complete && (
        <form className="creation-grille-screen__form" onSubmit={handleAjouter}>
          <input
            className="creation-grille-screen__input"
            type="text"
            placeholder="Ajoute une phrase..."
            maxLength={TEXTE_MAX_LENGTH}
            disabled={pending}
            value={nouvellePhrase}
            onChange={(event) => setNouvellePhrase(event.target.value)}
          />

          <Button type="submit" variant="primary" disabled={pending || !nouvellePhrase.trim()}>
            Ajouter la phrase
          </Button>
        </form>
      )}

      <Button type="button" variant="secondary" disabled={pending} onClick={onRetourBibliotheque}>
        Retour à la Bibliothèque
      </Button>
    </main>
  )
}
