import { useEffect, useState, type FormEvent } from 'react'
import * as grillesService from '../../services/grilles.service'
import * as phrasesService from '../../services/phrases.service'
import * as partiesService from '../../services/parties.service'
import { Button } from '../../components/Button'
import { BrandMark } from '../../components/BrandMark'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { Grille as GrilleBibliotheque, PartieActive } from '../bibliotheque/types'
import './CreationGrilleScreen.scss'

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
const TEXTE_MAX_LENGTH = 200

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

type CreationGrilleScreenProps = {
  grilleInitiale?: Grille | null
  onRetourBibliotheque: () => void
  onPartieLancee: (grille: GrilleBibliotheque, partie: PartieActive) => void
}

export function CreationGrilleScreen({
  grilleInitiale = null,
  onRetourBibliotheque,
  onPartieLancee,
}: CreationGrilleScreenProps) {
  const [grille, setGrille] = useState<Grille | null>(grilleInitiale)

  return grille ? (
    <ComposerPhrases grille={grille} onRetourBibliotheque={onRetourBibliotheque} onPartieLancee={onPartieLancee} />
  ) : (
    <NouvelleGrilleForm onCreated={setGrille} onRetourBibliotheque={onRetourBibliotheque} />
  )
}

type NouvelleGrilleFormProps = {
  onCreated: (grille: Grille) => void
  onRetourBibliotheque: () => void
}

const NOM_MAX_LENGTH = 100

function nomDeLaCopie(nomSource: string): string {
  const suffixe = ' (copie)'
  if (nomSource.length + suffixe.length <= NOM_MAX_LENGTH) {
    return `${nomSource}${suffixe}`
  }
  return `${nomSource.slice(0, NOM_MAX_LENGTH - suffixe.length)}${suffixe}`
}

function NouvelleGrilleForm({ onCreated, onRetourBibliotheque }: NouvelleGrilleFormProps) {
  const [nom, setNom] = useState('')
  const [taille, setTaille] = useState<number | null>(null)
  const [phrases, setPhrases] = useState<string[]>([])
  const [nouvellePhrase, setNouvellePhrase] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const total = taille ? taille * taille : 0
  const complete = taille !== null && phrases.length === total

  function handleAjouterPhrase(event: FormEvent) {
    event.preventDefault()
    const texte = nouvellePhrase.trim()
    if (!texte || phrases.length >= total) return

    setPhrases((current) => [...current, texte])
    setNouvellePhrase('')
  }

  async function handleCreer() {
    if (!taille || !complete) return

    setPending(true)
    setMessage(null)

    let nouvelleGrilleId: string | null = null

    try {
      const { data: nouvelleGrille, error: grilleError } = await grillesService.creerGrille(nom.trim(), taille)

      if (grilleError || !nouvelleGrille) {
        setMessage(friendlyErrorMessage())
        return
      }

      nouvelleGrilleId = nouvelleGrille.id

      const { error: phrasesError } = await phrasesService.creerPhrases(
        phrases.map((texte) => ({ grille_id: nouvelleGrilleId!, texte })),
      )

      if (phrasesError) {
        await grillesService.annulerCreationGrille(nouvelleGrilleId)
        setMessage(friendlyErrorMessage())
        return
      }

      onCreated({ id: nouvelleGrille.id, nom: nouvelleGrille.nom, taille: nouvelleGrille.taille })
    } catch {
      if (nouvelleGrilleId) {
        await grillesService.annulerCreationGrille(nouvelleGrilleId)
      }
      setMessage(friendlyErrorMessage())
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="creation-grille-screen">
      <BrandMark />
      <h1 className="creation-grille-screen__title">Nouvelle Grille</h1>

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

      <span className="creation-grille-screen__label">Taille de la grille</span>
      <div className="size-chips">
        {TAILLES.map((n) => (
          <button
            key={n}
            type="button"
            className={['size-chip', taille === n ? 'size-chip--active' : ''].filter(Boolean).join(' ')}
            aria-pressed={taille === n}
            disabled={pending}
            onClick={() => {
              setTaille(n)
              setPhrases([])
            }}
          >
            {n}×{n} - {n * n} phrases
          </button>
        ))}
      </div>

      {taille !== null && (
        <>
          <div className="creation-grille-screen__row">
            <span className="creation-grille-screen__label">Phrases de la grille</span>
            <span className="creation-grille-screen__counter">
              {phrases.length} / {total}
            </span>
          </div>

          <ul className="phrase-list">
            {phrases.map((texte, index) => (
              <li key={index} className="phrase-list__item--input">
                <input
                  className="creation-grille-screen__input"
                  maxLength={TEXTE_MAX_LENGTH}
                  disabled={pending}
                  value={texte}
                  placeholder={`Phrase numéro ${index + 1}`}
                  onChange={(event) => {
                    const valeur = event.target.value
                    setPhrases((current) => current.map((p, i) => (i === index ? valeur : p)))
                  }}
                />
              </li>
            ))}
          </ul>

          {phrases.length < total && (
            <form className="creation-grille-screen__form" onSubmit={handleAjouterPhrase}>
              <input
                className="creation-grille-screen__input"
                type="text"
                placeholder="Ecris quelque chose"
                maxLength={TEXTE_MAX_LENGTH}
                disabled={pending}
                value={nouvellePhrase}
                onChange={(event) => setNouvellePhrase(event.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={pending || !nouvellePhrase.trim()}>
                Ajouter une phrase
              </Button>
            </form>
          )}
        </>
      )}

      {message && <p className="creation-grille-screen__message">{message}</p>}

      <div className="sticky-action-bar">
        <Button type="button" variant="primary" disabled={pending || !nom.trim() || !complete} onClick={handleCreer}>
          Créer la grille
        </Button>
        <Button type="button" variant="close-game" disabled={pending} onClick={onRetourBibliotheque}>
          Annuler
        </Button>
      </div>
    </main>
  )
}

type ComposerPhrasesProps = {
  grille: Grille
  onRetourBibliotheque: () => void
  onPartieLancee: (grille: GrilleBibliotheque, partie: PartieActive) => void
}

function ComposerPhrases({ grille, onRetourBibliotheque, onPartieLancee }: ComposerPhrasesProps) {
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
  const [nom, setNom] = useState(grille.nom)
  const [taille, setTaille] = useState(grille.taille)
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
  const [dupliquantPending, setDupliquantPending] = useState(false)
  const [supprimantPending, setSupprimantPending] = useState(false)
  const [demandeSuppression, setDemandeSuppression] = useState(false)

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
          phrasesService.listerPhrasesDeGrille(grille.id),
          partiesService.existePartiePourGrille(grille.id),
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
      const { data, error } = await phrasesService.creerPhrase(grille.id, texte)

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
      const { data, error } = await partiesService.creerPartie(grille.id)

      if (error || !data) {
        setLancementMessage(friendlyErrorMessage())
        return
      }

      onPartieLancee(
        { id: grille.id, nom, taille, validee: true },
        { id: data.id, codePartie: data.code_partie, nombreJoueurs: 0, vainqueurs: [] },
      )
    } catch {
      setLancementMessage(friendlyErrorMessage())
    } finally {
      setLancementPending(false)
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
      const { error } = await phrasesService.modifierPhrase(id, texte)
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
      return
    }

    setNomPending(true)
    setMessage(null)

    try {
      const { error } = await grillesService.renommerGrille(grille.id, texte)
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
    }
  }

  async function handleDupliquer() {
    setDupliquantPending(true)
    setMessage(null)

    let nouvelleGrilleId: string | null = null

    try {
      const { data: nouvelleGrille, error: grilleError } = await grillesService.creerGrille(
        nomDeLaCopie(nom),
        taille,
      )

      if (grilleError || !nouvelleGrille) {
        setMessage(friendlyErrorMessage())
        return
      }

      nouvelleGrilleId = nouvelleGrille.id

      if (phrases.length > 0) {
        const { error: insertError } = await phrasesService.creerPhrases(
          phrases.map((p) => ({ grille_id: nouvelleGrilleId!, texte: p.texte })),
        )

        if (insertError) {
          await grillesService.annulerCreationGrille(nouvelleGrilleId)
          setMessage(friendlyErrorMessage())
          return
        }
      }

      onRetourBibliotheque()
    } catch {
      if (nouvelleGrilleId) {
        await grillesService.annulerCreationGrille(nouvelleGrilleId)
      }
      setMessage(friendlyErrorMessage())
    } finally {
      setDupliquantPending(false)
    }
  }

  async function handleSupprimer() {
    setSupprimantPending(true)
    setMessage(null)

    try {
      // `.select()` force la représentation de la ligne supprimée : même piège que
      // handleSupprimer (Bibliothèque) — un delete filtré en silence par RLS renverrait
      // sinon un succès sans erreur, sans que la grille n'ait réellement été supprimée.
      const { data, error } = await grillesService.supprimerGrille(grille.id)

      if (error || !data || data.length === 0) {
        setMessage(friendlyErrorMessage())
        return
      }

      onRetourBibliotheque()
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setSupprimantPending(false)
      setDemandeSuppression(false)
    }
  }

  async function handleChangerTaille(nouvelleTaille: number) {
    if (nouvelleTaille === taille) return

    setTaillePending(true)
    setMessage(null)

    try {
      const { error } = await grillesService.changerTailleGrille(grille.id, nouvelleTaille)
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
      const { data, error } = await phrasesService.supprimerPhrase(id)

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
      <BrandMark />
      <h1 className="creation-grille-screen__title">Modifier la grille</h1>

      <div className="creation-grille-screen__actions">
        {complete && (
          <>
            <Button type="button" variant="primary" disabled={lancementPending} onClick={handleLancerPartie}>
              {partieDejaLancee ? 'Relancer' : 'Lancer la Partie'}
            </Button>
            <Button type="button" variant="secondary" disabled={dupliquantPending} onClick={handleDupliquer}>
              Dupliquer
            </Button>
          </>
        )}
        <Button type="button" variant="close-game" onClick={() => setDemandeSuppression(true)}>
          Supprimer
        </Button>
      </div>

      <label className="creation-grille-screen__label" htmlFor="nom">
        Nom de la grille
      </label>
      <input
        id="nom"
        className="creation-grille-screen__input"
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
      {lancementMessage && <p className="creation-grille-screen__message">{lancementMessage}</p>}
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

      <div className="sticky-action-bar">
        <Button type="button" variant="primary" disabled={pending} onClick={onRetourBibliotheque}>
          Enregistrer
        </Button>
        <Button type="button" variant="close-game" disabled={pending} onClick={onRetourBibliotheque}>
          Annuler
        </Button>
      </div>

      {demandeSuppression && (
        <ConfirmDialog
          titre={`Supprimer ${nom} ?`}
          message="Cette grille sera définitivement supprimée."
          confirmLabel="Supprimer"
          confirmEnCours={supprimantPending}
          onConfirm={handleSupprimer}
          onCancel={() => setDemandeSuppression(false)}
        />
      )}
    </main>
  )
}
