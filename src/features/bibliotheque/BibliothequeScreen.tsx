import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './BibliothequeScreen.scss'

type Grille = {
  id: string
  nom: string
  taille: number
  validee: boolean
}

type PartieEnAttente = {
  id: string
  nom: string
  lien: string
}

type PartieActive = {
  id: string
  codePartie: string
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

function construireLienPartie(codePartie: string): string {
  return `${window.location.origin}?partie=${codePartie}`
}

type BibliothequeScreenProps = {
  onNouvelleGrille: () => void
  onModifierGrille: (grille: { id: string; nom: string; taille: number }) => void
}

export function BibliothequeScreen({ onNouvelleGrille, onModifierGrille }: BibliothequeScreenProps) {
  const [grilles, setGrilles] = useState<Grille[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dupliquantIds, setDupliquantIds] = useState<Set<string>>(new Set())
  const [lancementIds, setLancementIds] = useState<Set<string>>(new Set())
  const [liensPartie, setLiensPartie] = useState<Record<string, string>>({})
  const [liensCopies, setLiensCopies] = useState<Set<string>>(new Set())
  const [partiesEnAttente, setPartiesEnAttente] = useState<PartieEnAttente[]>([])
  const [partiesActivesParGrille, setPartiesActivesParGrille] = useState<Record<string, PartieActive[]>>({})
  const [clotureEnAttenteIds, setClotureEnAttenteIds] = useState<Set<string>>(new Set())
  const [suppressionConfirmIds, setSuppressionConfirmIds] = useState<Set<string>>(new Set())
  const [supprimantIds, setSupprimantIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let ignore = false

    setChargement(true)
    setChargementEchoue(false)
    setGrilles([])
    setMessage(null)
    setPartiesEnAttente([])
    setPartiesActivesParGrille({})

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

        // Parties actives par grille : indicateur persistant (survit au rechargement,
        // contrairement à `liensPartie` qui n'existe que le temps de la session après un
        // clic sur "Relancer") de toute partie encore `en_cours`, qu'un vainqueur ait été
        // déclaré ou non. Repose sur la policy select déjà existante ("Créateur lit ses
        // parties", Story 2.1) : aucune nouvelle policy/colonne nécessaire. Dégradation
        // silencieuse en cas d'échec, même principe que le rappel de clôture ci-dessous.
        const { data: partiesActivesData, error: partiesActivesError } = await supabase
          .from('parties')
          .select('id, grille_id, code_partie')
          .in('grille_id', ids)
          .eq('statut', 'en_cours')

        if (ignore) return

        if (!partiesActivesError && partiesActivesData) {
          const parGrille: Record<string, PartieActive[]> = {}
          for (const p of partiesActivesData) {
            const liste = parGrille[p.grille_id] ?? []
            liste.push({ id: p.id, codePartie: p.code_partie })
            parGrille[p.grille_id] = liste
          }
          setPartiesActivesParGrille(parGrille)
        }

        // Rappel de partie en cours (FR-14) : chargement séquentiel supplémentaire,
        // dégradation silencieuse en cas d'échec (pas de bannière), jamais un blocage
        // de tout l'écran — même principe que les requêtes secondaires de
        // GrilleEnDirecteScreen. Filtre explicite par compte_id requis (revue de code) :
        // les policies RLS s'additionnent par OR, la policy "Joueur lit les vainqueurs de
        // sa partie" (Story 2.4) reste active en plus de la nouvelle policy créateur —
        // sans ce filtre, un joueur non-créateur ayant rejoint la partie d'un ami avec
        // son propre compte verrait aussi cette bannière dans sa propre Bibliothèque.
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { data: rappelsData, error: rappelsError } = await supabase
          .from('parties_vainqueurs')
          .select('parties!inner(id, code_partie, statut, grilles!inner(nom, compte_id))')
          .eq('parties.statut', 'en_cours')
          .eq('parties.grilles.compte_id', user?.id ?? '')

        if (ignore) return

        if (!rappelsError && rappelsData) {
          // Dédupliqué par partie.id : une partie à plusieurs co-vainqueurs (Story 2.4)
          // produit une ligne parties_vainqueurs par vainqueur, la bannière ne doit
          // lister chaque partie en attente qu'une seule fois.
          const dedup = new Map<string, PartieEnAttente>()
          for (const row of rappelsData as unknown as Array<{
            parties: { id: string; code_partie: string; grilles: { nom: string } }
          }>) {
            const { id, code_partie, grilles: g } = row.parties
            dedup.set(id, { id, nom: g.nom, lien: construireLienPartie(code_partie) })
          }
          setPartiesEnAttente([...dedup.values()])
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

  async function handleRelancer(grille: Grille) {
    setLancementIds((current) => new Set(current).add(grille.id))
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({ grille_id: grille.id })
        .select()
        .single()

      if (error || !data) {
        setMessage(friendlyErrorMessage())
        return
      }

      setLiensPartie((current) => ({ ...current, [grille.id]: construireLienPartie(data.code_partie) }))
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setLancementIds((current) => {
        const next = new Set(current)
        next.delete(grille.id)
        return next
      })
    }
  }

  async function handleCopierLien(grilleId: string, lien: string) {
    try {
      await navigator.clipboard.writeText(lien)
      setLiensCopies((current) => new Set(current).add(grilleId))
      setTimeout(() => {
        setLiensCopies((current) => {
          const next = new Set(current)
          next.delete(grilleId)
          return next
        })
      }, 2000)
    } catch {
      // Échec silencieux toléré : le lien reste affiché et copiable manuellement.
    }
  }

  async function handleCloturerEnAttente(partieId: string) {
    setClotureEnAttenteIds((current) => new Set(current).add(partieId))
    setMessage(null)

    try {
      // `.select()` force la représentation de la ligne modifiée : même piège que
      // `handleCloturer` de GrilleEnDirecteScreen (Story 2.5) — un update filtré en
      // silence par RLS renverrait sinon un succès sans erreur, sans que la clôture
      // n'ait réellement eu lieu.
      const { data, error } = await supabase
        .from('parties')
        .update({ statut: 'terminee' })
        .eq('id', partieId)
        .select()

      if (error || !data || data.length === 0) {
        setMessage(friendlyErrorMessage())
        return
      }

      setPartiesEnAttente((current) => current.filter((p) => p.id !== partieId))
      setPartiesActivesParGrille((current) => {
        const next: Record<string, PartieActive[]> = {}
        for (const [grilleId, liste] of Object.entries(current)) {
          const filtree = liste.filter((p) => p.id !== partieId)
          if (filtree.length > 0) next[grilleId] = filtree
        }
        return next
      })
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setClotureEnAttenteIds((current) => {
        const next = new Set(current)
        next.delete(partieId)
        return next
      })
    }
  }

  function handleDemanderSuppression(grilleId: string) {
    setSuppressionConfirmIds((current) => new Set(current).add(grilleId))
  }

  function handleAnnulerSuppression(grilleId: string) {
    setSuppressionConfirmIds((current) => {
      const next = new Set(current)
      next.delete(grilleId)
      return next
    })
  }

  async function handleSupprimer(grille: Grille) {
    setSupprimantIds((current) => new Set(current).add(grille.id))
    setMessage(null)

    try {
      // `.select()` force la représentation de la ligne supprimée : même piège que
      // handleCloturer/handleToggle — un delete filtré en silence par RLS renverrait
      // sinon un succès sans erreur, sans que la grille n'ait réellement été supprimée.
      const { data, error } = await supabase.from('grilles').delete().eq('id', grille.id).select()

      if (error || !data || data.length === 0) {
        setMessage(friendlyErrorMessage())
        return
      }

      setGrilles((current) => current.filter((g) => g.id !== grille.id))
    } catch {
      setMessage(friendlyErrorMessage())
    } finally {
      setSupprimantIds((current) => {
        const next = new Set(current)
        next.delete(grille.id)
        return next
      })
      setSuppressionConfirmIds((current) => {
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

      <Button type="button" variant="primary" onClick={onNouvelleGrille}>
        Nouvelle grille
      </Button>
      {partiesEnAttente.length > 0 && (
        <RappelPartieEnCours
          parties={partiesEnAttente}
          liensCopies={liensCopies}
          onCopierLien={handleCopierLien}
          clotureEnAttenteIds={clotureEnAttenteIds}
          onCloturer={handleCloturerEnAttente}
        />
      )}

      {grilles.length === 0 ? (
        <p className="bibliotheque-screen__subtitle">Crée ta première grille pour commencer !</p>
      ) : (
        <ul className="grille-list">
          {grilles.map((grille) => (
            <li key={grille.id} className="grille-list__item">
              <div className="grille-list__row">
                <span className="grille-list__nom">{grille.nom}</span>
              </div>
              <div className="grille-list__actions">
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Modifier ${grille.nom}`}
                  onClick={() => onModifierGrille({ id: grille.id, nom: grille.nom, taille: grille.taille })}
                >
                  Modifier
                </Button>
                {grille.validee && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Relancer ${grille.nom}`}
                      disabled={lancementIds.has(grille.id)}
                      onClick={() => handleRelancer(grille)}
                    >
                      Relancer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Dupliquer ${grille.nom}`}
                      disabled={dupliquantIds.has(grille.id)}
                      onClick={() => handleDupliquer(grille)}
                    >
                      Dupliquer
                    </Button>
                  </>
                )}
                {suppressionConfirmIds.has(grille.id) ? (
                  <>
                    <Button
                      type="button"
                      variant="close-game"
                      aria-label={`Confirmer la suppression de ${grille.nom}`}
                      disabled={supprimantIds.has(grille.id)}
                      onClick={() => handleSupprimer(grille)}
                    >
                      Confirmer la suppression ?
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Annuler la suppression de ${grille.nom}`}
                      onClick={() => handleAnnulerSuppression(grille.id)}
                    >
                      Annuler
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="close-game"
                    aria-label={`Supprimer ${grille.nom}`}
                    onClick={() => handleDemanderSuppression(grille.id)}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
              {liensPartie[grille.id] && (
                <div className="grille-list__partie">
                  <p className="grille-list__partie-titre">Ta partie est prête ! Partage ce lien :</p>
                  <p className="grille-list__lien">{liensPartie[grille.id]}</p>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      window.location.href = liensPartie[grille.id]
                    }}
                  >
                    Rejoindre maintenant
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleCopierLien(grille.id, liensPartie[grille.id])}
                  >
                    {liensCopies.has(grille.id) ? 'Lien copié !' : 'Copier le lien'}
                  </Button>
                </div>
              )}
              {(partiesActivesParGrille[grille.id] ?? []).map((partie) => {
                const lien = construireLienPartie(partie.codePartie)
                return (
                  <div key={partie.id} className="grille-list__partie">
                    <p className="grille-list__partie-titre">Partie en cours :</p>
                    <p className="grille-list__lien">{lien}</p>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        window.location.href = lien
                      }}
                    >
                      Rejoindre maintenant
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleCopierLien(partie.id, lien)}>
                      {liensCopies.has(partie.id) ? 'Lien copié !' : 'Copier le lien'}
                    </Button>
                    <Button
                      type="button"
                      variant="close-game"
                      disabled={clotureEnAttenteIds.has(partie.id)}
                      onClick={() => handleCloturerEnAttente(partie.id)}
                    >
                      Clôturer la Partie
                    </Button>
                  </div>
                )
              })}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="bibliotheque-screen__message">{message}</p>}
      <Button type="button" variant="secondary" disabled={signingOut} onClick={handleSignOut}>
        Me déconnecter
      </Button>
    </main>
  )
}

type RappelPartieEnCoursProps = {
  parties: PartieEnAttente[]
  liensCopies: Set<string>
  onCopierLien: (partieId: string, lien: string) => void
  clotureEnAttenteIds: Set<string>
  onCloturer: (partieId: string) => void
}

function RappelPartieEnCours({
  parties,
  liensCopies,
  onCopierLien,
  clotureEnAttenteIds,
  onCloturer,
}: RappelPartieEnCoursProps) {
  return (
    <div className="bibliotheque-screen__rappel">
      <p className="bibliotheque-screen__rappel-titre">
        Une Partie est toujours en cours — tu veux la clôturer ?
      </p>
      {parties.map((partie) => (
        <div key={partie.id} className="bibliotheque-screen__rappel-item">
          <span className="grille-list__nom">{partie.nom}</span>
          <p className="grille-list__lien">{partie.lien}</p>
          <div className="grille-list__actions">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                window.location.href = partie.lien
              }}
            >
              Rejoindre maintenant
            </Button>
            <Button type="button" variant="secondary" onClick={() => onCopierLien(partie.id, partie.lien)}>
              {liensCopies.has(partie.id) ? 'Lien copié !' : 'Copier le lien'}
            </Button>
            <Button
              type="button"
              variant="close-game"
              disabled={clotureEnAttenteIds.has(partie.id)}
              onClick={() => onCloturer(partie.id)}
            >
              Clôturer la Partie
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
