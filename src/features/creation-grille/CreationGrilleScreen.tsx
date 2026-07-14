import { useEffect, useState, type FormEvent } from 'react'
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

const TAILLES = [3, 4, 5]

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

type CreationGrilleScreenProps = {
  grilleInitiale?: Grille | null
  onRetourBibliotheque: () => void
}

export function CreationGrilleScreen({ grilleInitiale = null, onRetourBibliotheque }: CreationGrilleScreenProps) {
  const [grille, setGrille] = useState<Grille | null>(grilleInitiale)

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

type PartieLancee = {
  lien: string
}

function construireLienPartie(codePartie: string): string {
  return `${window.location.origin}?partie=${codePartie}`
}

function ComposerPhrases({ grille, onRetourBibliotheque }: ComposerPhrasesProps) {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)
  const [nouvellePhrase, setNouvellePhrase] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTexte, setEditingTexte] = useState('')
  const [lancementPending, setLancementPending] = useState(false)
  const [lancementMessage, setLancementMessage] = useState<string | null>(null)
  const [partieLancee, setPartieLancee] = useState<PartieLancee | null>(null)
  const [lienCopie, setLienCopie] = useState(false)
  const [nom, setNom] = useState(grille.nom)
  const [taille, setTaille] = useState(grille.taille)
  const [editingNom, setEditingNom] = useState(false)
  const [nomEnEdition, setNomEnEdition] = useState(grille.nom)
  const [nomPending, setNomPending] = useState(false)
  const [taillePending, setTaillePending] = useState(false)
  const [supprimantPhraseIds, setSupprimantPhraseIds] = useState<Set<string>>(new Set())
  // Échec sûr par défaut : tant que la vérification serveur n'a pas confirmé qu'aucune
  // Partie n'existe pour cette grille, on suppose qu'une existe (chips de taille masqués)
  // plutôt que de risquer d'afficher un contrôle qui échouerait silencieusement (le
  // trigger empecher_modification_taille_si_partie_lancee bloque de toute façon la
  // modification côté serveur, mais autant ne jamais l'exposer dans ce cas).
  const [partieDejaLancee, setPartieDejaLancee] = useState(true)

  const total = taille * taille
  const complete = phrases.length === total

  useEffect(() => {
    let ignore = false

    setChargement(true)
    setChargementEchoue(false)
    setPhrases([])

    async function charger() {
      try {
        const [phrasesResult, partiesResult] = await Promise.all([
          supabase.from('phrases').select('id, texte').eq('grille_id', grille.id).order('created_at'),
          supabase.from('parties').select('id').eq('grille_id', grille.id).limit(1),
        ])

        if (ignore) return

        const { data, error } = phrasesResult
        if (error || !data) {
          setChargementEchoue(true)
        } else {
          setPhrases(data)
        }

        // Dégradation silencieuse en cas d'échec de cette vérification secondaire (même
        // principe que les requêtes secondaires de GrilleEnDirecteScreen) : on garde le
        // défaut sûr `true` (chips masqués) plutôt que de bloquer tout l'écran pour ça.
        if (!partiesResult.error) {
          setPartieDejaLancee((partiesResult.data?.length ?? 0) > 0)
        }
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
  }, [grille.id, retry])

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

  async function handleLancerPartie() {
    setLancementPending(true)
    setLancementMessage(null)

    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({ grille_id: grille.id })
        .select()
        .single()

      if (error || !data) {
        setLancementMessage(friendlyErrorMessage())
        return
      }

      setPartieLancee({ lien: construireLienPartie(data.code_partie) })
    } catch {
      setLancementMessage(friendlyErrorMessage())
    } finally {
      setLancementPending(false)
    }
  }

  async function handleCopierLien(lien: string) {
    try {
      await navigator.clipboard.writeText(lien)
      setLienCopie(true)
      setTimeout(() => setLienCopie(false), 2000)
    } catch {
      // Échec silencieux toléré : le lien reste affiché et copiable manuellement.
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

  async function handleRenommer() {
    const texte = nomEnEdition.trim()
    if (!texte || texte === nom) {
      setNomEnEdition(nom)
      setEditingNom(false)
      return
    }

    setNomPending(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('grilles').update({ nom: texte }).eq('id', grille.id)
      if (error) {
        setMessage(friendlyErrorMessage())
        setNomEnEdition(nom)
        return
      }
      setNom(texte)
    } catch {
      setMessage(friendlyErrorMessage())
      setNomEnEdition(nom)
    } finally {
      setNomPending(false)
      setEditingNom(false)
    }
  }

  async function handleChangerTaille(nouvelleTaille: number) {
    if (nouvelleTaille === taille) return

    setTaillePending(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('grilles').update({ taille: nouvelleTaille }).eq('id', grille.id)
      if (error) {
        setMessage(friendlyErrorMessage())
        return
      }
      setTaille(nouvelleTaille)
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setTaillePending(false)
    }
  }

  async function handleSupprimerPhrase(id: string) {
    setSupprimantPhraseIds((current) => new Set(current).add(id))
    setMessage(null)

    try {
      // `.select()` force la représentation de la ligne supprimée : même piège que
      // handleSupprimer (Bibliothèque) — un delete filtré en silence par RLS ou refusé
      // par le trigger de verrouillage renverrait sinon un succès sans erreur.
      const { data, error } = await supabase.from('phrases').delete().eq('id', id).select()

      if (error || !data || data.length === 0) {
        setMessage(friendlyErrorMessage())
        return
      }

      setPhrases((current) => current.filter((p) => p.id !== id))
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setSupprimantPhraseIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  if (chargement) {
    return null
  }

  if (chargementEchoue) {
    return (
      <main className="creation-grille-screen">
        <p className="creation-grille-screen__message">{friendlyErrorMessage()}</p>
        <Button type="button" variant="primary" onClick={() => setRetry((n) => n + 1)}>
          Réessayer
        </Button>
        <Button type="button" variant="secondary" onClick={onRetourBibliotheque}>
          Retour à la Bibliothèque
        </Button>
      </main>
    )
  }

  return (
    <main className="creation-grille-screen">
      {editingNom ? (
        <input
          className="creation-grille-screen__input creation-grille-screen__title-input"
          autoFocus
          maxLength={NOM_MAX_LENGTH}
          disabled={nomPending}
          value={nomEnEdition}
          onChange={(event) => setNomEnEdition(event.target.value)}
          onBlur={handleRenommer}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <h1
          className="creation-grille-screen__title"
          onClick={() => {
            setNomEnEdition(nom)
            setEditingNom(true)
          }}
        >
          {nom}
        </h1>
      )}

      {!partieDejaLancee && (
        <div className="size-chips">
          {TAILLES.map((n) => (
            <button
              key={n}
              type="button"
              className={['size-chip', taille === n ? 'size-chip--active' : ''].filter(Boolean).join(' ')}
              aria-pressed={taille === n}
              disabled={taillePending}
              onClick={() => handleChangerTaille(n)}
            >
              {n}×{n} - {n * n} phrases
            </button>
          ))}
        </div>
      )}

      <p className="creation-grille-screen__counter">
        {phrases.length} / {total}
      </p>
      {complete && <p className="creation-grille-screen__complete">Ta grille est complète !</p>}
      {message && <p className="creation-grille-screen__message">{message}</p>}

      {complete && !partieLancee && (
        <>
          {lancementMessage && <p className="creation-grille-screen__message">{lancementMessage}</p>}
          <Button type="button" variant="primary" disabled={lancementPending} onClick={handleLancerPartie}>
            Lancer la Partie
          </Button>
        </>
      )}

      {partieLancee && (
        <div className="creation-grille-screen__partie">
          <p className="creation-grille-screen__partie-titre">Ta partie est prête ! Partage ce lien :</p>
          <p className="creation-grille-screen__lien">{partieLancee.lien}</p>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              window.location.href = partieLancee.lien
            }}
          >
            Rejoindre maintenant
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleCopierLien(partieLancee.lien)}
          >
            {lienCopie ? 'Lien copié !' : 'Copier le lien'}
          </Button>
        </div>
      )}

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
            <li key={phrase.id} className="phrase-list__item">
              <span className="phrase-list__texte" onClick={() => startEdit(phrase)}>
                {phrase.texte}
              </span>
              {!partieDejaLancee && (
                <Button
                  type="button"
                  variant="close-game"
                  className="phrase-list__supprimer"
                  aria-label={`Supprimer la phrase "${phrase.texte}"`}
                  disabled={supprimantPhraseIds.has(phrase.id)}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSupprimerPhrase(phrase.id)
                  }}
                >
                  Supprimer
                </Button>
              )}
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
