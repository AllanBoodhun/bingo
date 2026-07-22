import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import { BrandMark } from '../../components/BrandMark'
import { GrilleCard } from './components/GrilleCard'
import { RappelPartieEnCours } from './components/RappelPartieEnCours'
import type { Grille, PartieActive, PartieEnAttente } from './types'
import { construireLienPartie } from './utils'
import './BibliothequeScreen.scss'

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
          const partieIds = partiesActivesData.map((p) => p.id)

          // Nombre de joueurs + vainqueur(s) par partie active : requêtes secondaires,
          // dégradation silencieuse en cas d'échec (la carte reste utilisable sans ces
          // deux informations). Nécessite la policy "Créateur lit les joueurs de ses
          // parties" (migration 20260722120000) en plus de la policy créateur déjà
          // existante sur parties_vainqueurs (Story 2.5).
          const nombreJoueursParPartie = new Map<string, number>()
          const vainqueursParPartie = new Map<string, string[]>()

          if (partieIds.length > 0) {
            const { data: joueursData, error: joueursError } = await supabase
              .from('joueurs')
              .select('partie_id')
              .in('partie_id', partieIds)

            if (!ignore && !joueursError && joueursData) {
              for (const { partie_id } of joueursData) {
                nombreJoueursParPartie.set(partie_id, (nombreJoueursParPartie.get(partie_id) ?? 0) + 1)
              }
            }

            const { data: vainqueursData, error: vainqueursError } = await supabase
              .from('parties_vainqueurs')
              .select('partie_id, joueurs(pseudo)')
              .in('partie_id', partieIds)

            if (!ignore && !vainqueursError && vainqueursData) {
              for (const row of vainqueursData as unknown as Array<{ partie_id: string; joueurs: { pseudo: string } }>) {
                const liste = vainqueursParPartie.get(row.partie_id) ?? []
                liste.push(row.joueurs.pseudo)
                vainqueursParPartie.set(row.partie_id, liste)
              }
            }
          }

          if (ignore) return

          const parGrille: Record<string, PartieActive[]> = {}
          for (const p of partiesActivesData) {
            const liste = parGrille[p.grille_id] ?? []
            liste.push({
              id: p.id,
              codePartie: p.code_partie,
              nombreJoueurs: nombreJoueursParPartie.get(p.id) ?? 0,
              vainqueurs: vainqueursParPartie.get(p.id) ?? [],
            })
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

  const grillesActives = grilles.filter((g) => (partiesActivesParGrille[g.id] ?? []).length > 0)
  const grillesAutres = grilles.filter((g) => (partiesActivesParGrille[g.id] ?? []).length === 0)

  function renderGrilleCard(grille: Grille) {
    return (
      <GrilleCard
        key={grille.id}
        grille={grille}
        lienPartie={liensPartie[grille.id]}
        liensCopies={liensCopies}
        partiesActives={partiesActivesParGrille[grille.id] ?? []}
        lancementEnCours={lancementIds.has(grille.id)}
        dupliquantEnCours={dupliquantIds.has(grille.id)}
        confirmationSuppression={suppressionConfirmIds.has(grille.id)}
        suppressionEnCours={supprimantIds.has(grille.id)}
        clotureEnAttenteIds={clotureEnAttenteIds}
        onModifierGrille={onModifierGrille}
        onRelancer={handleRelancer}
        onDupliquer={handleDupliquer}
        onDemanderSuppression={handleDemanderSuppression}
        onAnnulerSuppression={handleAnnulerSuppression}
        onSupprimer={handleSupprimer}
        onCopierLien={handleCopierLien}
        onCloturerEnAttente={handleCloturerEnAttente}
      />
    )
  }

  return (
    <main className="bibliotheque-screen">
      <h1 className="sr-only">Bibliothèque</h1>
      <BrandMark />

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
        <>
          {grillesActives.length > 0 && (
            <div className="grille-list__section">
              <p className="grille-list__section-title">Partie en cours - {grillesActives.length}</p>
              <ul className="grille-list">{grillesActives.map(renderGrilleCard)}</ul>
            </div>
          )}
          {grillesAutres.length > 0 && (
            <div className="grille-list__section">
              <p className="grille-list__section-title">Mes grilles - {grillesAutres.length}</p>
              <ul className="grille-list">{grillesAutres.map(renderGrilleCard)}</ul>
            </div>
          )}
        </>
      )}

      {message && <p className="bibliotheque-screen__message">{message}</p>}
      <Button type="button" variant="secondary" disabled={signingOut} onClick={handleSignOut}>
        Me déconnecter
      </Button>
    </main>
  )
}
