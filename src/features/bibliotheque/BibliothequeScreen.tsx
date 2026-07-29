import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import { BrandMark } from '../../components/BrandMark'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { GrilleCard } from './components/GrilleCard'
import { PartieEnCoursCard } from './components/PartieEnCoursCard'
import { PartieRejointeCard } from './components/PartieRejointeCard'
import type { Grille, PartieActive } from './types'
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
  // Identité du compte courant (`session.user.id`, App.tsx) : nécessaire pour filtrer
  // les parties rejointes par ce compte (`joueurs.compte_id`), indépendamment des
  // grilles qu'il possède lui-même.
  compteId: string
  onNouvelleGrille: () => void
  onModifierGrille: (grille: { id: string; nom: string; taille: number }) => void
  onRejoindrePartie: (grille: Grille, partie: PartieActive) => void
}

export function BibliothequeScreen({
  compteId,
  onNouvelleGrille,
  onModifierGrille,
  onRejoindrePartie,
}: BibliothequeScreenProps) {
  const [grilles, setGrilles] = useState<Grille[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dupliquantIds, setDupliquantIds] = useState<Set<string>>(new Set())
  const [lancementIds, setLancementIds] = useState<Set<string>>(new Set())
  const [partiesActivesParGrille, setPartiesActivesParGrille] = useState<Record<string, PartieActive[]>>({})
  const [partiesRejointes, setPartiesRejointes] = useState<Array<{ grille: Grille; partie: PartieActive }>>([])
  const [confirmation, setConfirmation] = useState<
    { type: 'suppression'; grille: Grille } | { type: 'cloture'; partieId: string; grilleNom: string } | null
  >(null)
  const [confirmationEnCours, setConfirmationEnCours] = useState(false)

  useEffect(() => {
    let ignore = false

    setChargement(true)
    setChargementEchoue(false)
    setGrilles([])
    setMessage(null)
    setPartiesActivesParGrille({})
    setPartiesRejointes([])

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

        // Pas de `return` anticipé quand `grillesData` est vide (contrairement à
        // avant cette section) : un compte peut n'avoir créé aucune grille et
        // pourtant participer à celle d'un autre créateur — le fetch des parties
        // rejointes ci-dessous doit s'exécuter dans les deux cas.
        const ids = grillesData.map((g) => g.id)

        if (ids.length > 0) {
          const { data: phrasesData, error: phrasesError } = await supabase
            .from('phrases')
            .select('grille_id')
            .in('grille_id', ids)

          if (ignore) return

          // Pas de `return` anticipé ici (contrairement à avant cette section) : un
          // échec de ce fetch secondaire (utilisé seulement pour calculer `validee`)
          // ne doit bloquer ni "Mes grilles" (dégradé en `validee: false`, échec sûr —
          // masque juste Relancer/Dupliquer) ni, surtout, le fetch des parties
          // rejointes plus bas dans cette même fonction, qui n'a aucun lien avec ce
          // calcul et ne doit jamais être court-circuité par son échec.
          const comptesParGrille = new Map<string, number>()
          if (!phrasesError && phrasesData) {
            for (const { grille_id } of phrasesData) {
              comptesParGrille.set(grille_id, (comptesParGrille.get(grille_id) ?? 0) + 1)
            }
          }

          setGrilles(
            grillesData.map((g) => ({
              id: g.id,
              nom: g.nom,
              taille: g.taille,
              validee: (comptesParGrille.get(g.id) ?? 0) === g.taille * g.taille,
            })),
          )
        } else {
          setGrilles([])
        }

        // Parties actives par grille : indicateur persistant (survit au rechargement,
        // contrairement à `liensPartie` qui n'existe que le temps de la session après un
        // clic sur "Relancer") de toute partie encore `en_cours`, qu'un vainqueur ait été
        // déclaré ou non. Repose sur la policy select déjà existante ("Créateur lit ses
        // parties", Story 2.1) : aucune nouvelle policy/colonne nécessaire. Dégradation
        // silencieuse en cas d'échec, même principe que le rappel de clôture ci-dessous.
        // Ignoré si `ids` est vide (aucune grille possédée) : `.in()` avec un tableau
        // vide n'a rien à filtrer et éviterait une requête PostgREST inutile.
        let partiesActivesData: Array<{ id: string; grille_id: string; code_partie: string }> | null = []
        let partiesActivesError: unknown = null
        if (ids.length > 0) {
          const resultat = await supabase
            .from('parties')
            .select('id, grille_id, code_partie')
            .in('grille_id', ids)
            .eq('statut', 'en_cours')
          partiesActivesData = resultat.data
          partiesActivesError = resultat.error
        }

        if (ignore) return

        // Parties auxquelles ce compte participe sans en être le créateur (nouvelle
        // section "Parties auxquelles je participe") : `joueurs.compte_id` (Story 2.2)
        // n'est renseigné à `auth.uid()` que pour un compte réel — jamais pour un
        // invité anonyme, qui garde `compte_id null` — c'est directement le bon filtre
        // d'identité. Aucune nouvelle policy select sur `joueurs` nécessaire : la
        // policy existante "Joueur lit les joueurs de sa partie" (est_dans_la_partie)
        // couvre déjà cette ligne, puisque `auth_user_id` vaut ce même `auth.uid()`
        // pour un compte réel (rejoindre_partie). Dégradation silencieuse en cas
        // d'échec, même principe que le fetch ci-dessus.
        const { data: joueursComptesData, error: joueursComptesError } = await supabase
          .from('joueurs')
          .select('partie_id')
          .eq('compte_id', compteId)

        if (ignore) return

        let partiesRejointesBrutes: Array<{ id: string; grille_id: string; code_partie: string }> = []
        if (!joueursComptesError && joueursComptesData && joueursComptesData.length > 0) {
          const partieIdsRejointes = [...new Set(joueursComptesData.map((j) => j.partie_id))]
          const { data: partiesRejointesData, error: partiesRejointesError } = await supabase
            .from('parties')
            .select('id, grille_id, code_partie')
            .in('id', partieIdsRejointes)
            .eq('statut', 'en_cours')

          if (ignore) return

          if (!partiesRejointesError && partiesRejointesData) {
            // Exclut les parties de ses propres grilles : un créateur qui a rejoint sa
            // propre partie via son propre lien (cas rare mais possible, session déjà
            // active en ouvrant le lien) ne doit jamais voir la partie dupliquée entre
            // les deux sections — "Partie en cours" reste réservée aux grilles possédées
            // (Never de la spec : ne jamais fusionner les deux sections).
            partiesRejointesBrutes = partiesRejointesData.filter((p) => !ids.includes(p.grille_id))
          }
        }

        // Nom/taille des grilles rejointes : nécessite la policy "Joueur lit les
        // grilles des parties auxquelles il participe" (nouvelle migration) — seule
        // policy select qui autorise un non-créateur à lire une grille qu'il ne
        // possède pas. Dégradation silencieuse en cas d'échec (même principe).
        const idsGrillesRejointes = [...new Set(partiesRejointesBrutes.map((p) => p.grille_id))]
        let grillesRejointesData: Array<{ id: string; nom: string; taille: number }> = []
        if (idsGrillesRejointes.length > 0) {
          const { data: grillesRejointesResult, error: grillesRejointesError } = await supabase
            .from('grilles')
            .select('id, nom, taille')
            .in('id', idsGrillesRejointes)

          if (ignore) return

          if (!grillesRejointesError && grillesRejointesResult) {
            grillesRejointesData = grillesRejointesResult
          }
        }

        const partiesActivesSafe = !partiesActivesError && partiesActivesData ? partiesActivesData : []
        // Liste étendue (pas dupliquée) : une seule paire de requêtes ci-dessous couvre
        // à la fois les parties créateur et les parties rejointes, plutôt que de
        // relancer joueurs/parties_vainqueurs une seconde fois pour la nouvelle section.
        const partieIds = [...partiesActivesSafe.map((p) => p.id), ...partiesRejointesBrutes.map((p) => p.id)]

        // Nombre de joueurs + vainqueur(s) par partie active : requêtes secondaires,
        // dégradation silencieuse en cas d'échec (la carte reste utilisable sans ces
        // deux informations). Nécessite la policy "Créateur lit les joueurs de ses
        // parties" (migration 20260722120000) en plus de la policy créateur déjà
        // existante sur parties_vainqueurs (Story 2.5), et pour la partie rejointe la
        // policy "Joueur lit les joueurs de sa partie"/"Joueur lit les vainqueurs de sa
        // partie" déjà en place (Story 2.2/2.4).
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
        for (const p of partiesActivesSafe) {
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

        const grillesRejointesParId = new Map(grillesRejointesData.map((g) => [g.id, g]))
        const rejointes: Array<{ grille: Grille; partie: PartieActive }> = []
        for (const p of partiesRejointesBrutes) {
          const grilleRejointe = grillesRejointesParId.get(p.grille_id)
          // Grille introuvable (échec réseau ci-dessus, ou supprimée entre-temps) :
          // exclusion silencieuse de cette carte plutôt qu'un affichage partiel.
          if (!grilleRejointe) continue
          rejointes.push({
            // `validee` toujours vraie ici : une partie ne peut être lancée que depuis
            // une grille entièrement remplie (contrainte déjà appliquée à la création),
            // aucune requête `phrases` supplémentaire nécessaire pour ce champ — jamais
            // affiché sur PartieRejointeCard, seulement utile à `handleDupliquer`.
            grille: { id: grilleRejointe.id, nom: grilleRejointe.nom, taille: grilleRejointe.taille, validee: true },
            partie: {
              id: p.id,
              codePartie: p.code_partie,
              nombreJoueurs: nombreJoueursParPartie.get(p.id) ?? 0,
              vainqueurs: vainqueursParPartie.get(p.id) ?? [],
            },
          })
        }
        setPartiesRejointes(rejointes)
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
  }, [retry, compteId])

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

      onRejoindrePartie(grille, {
        id: data.id,
        codePartie: data.code_partie,
        nombreJoueurs: 0,
        vainqueurs: [],
      })
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

  async function cloturerPartie(partieId: string) {
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
    }
  }

  async function supprimerGrille(grille: Grille) {
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
    }
  }

  function handleDemanderSuppression(grille: Grille) {
    setConfirmation({ type: 'suppression', grille })
  }

  function handleDemanderCloture(partieId: string, grilleNom: string) {
    setConfirmation({ type: 'cloture', partieId, grilleNom })
  }

  function handleAnnulerConfirmation() {
    if (confirmationEnCours) return
    setConfirmation(null)
  }

  async function handleConfirmer() {
    if (!confirmation) return
    setConfirmationEnCours(true)
    setMessage(null)

    if (confirmation.type === 'suppression') {
      await supprimerGrille(confirmation.grille)
    } else {
      await cloturerPartie(confirmation.partieId)
    }

    setConfirmationEnCours(false)
    setConfirmation(null)
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

  // Une seule catégorie "Partie en cours" pour toute partie encore `en_cours` en base,
  // qu'un vainqueur ait été déclaré ou non (Terminée = en attente de clôture) — le
  // statut distingue les deux au sein d'une même card, plus de double affichage.
  // "Mes grilles" liste ensuite systématiquement toutes les grilles, actives ou non,
  // pour permettre de relancer une partie sur n'importe quel modèle.
  const partiesEnCours = grilles.flatMap((grille) =>
    (partiesActivesParGrille[grille.id] ?? []).map((partie) => ({ grille, partie })),
  )

  function renderGrilleCard(grille: Grille) {
    return (
      <GrilleCard
        key={grille.id}
        grille={grille}
        lancementEnCours={lancementIds.has(grille.id)}
        dupliquantEnCours={dupliquantIds.has(grille.id)}
        onModifierGrille={onModifierGrille}
        onRelancer={handleRelancer}
        onDupliquer={handleDupliquer}
        onDemanderSuppression={handleDemanderSuppression}
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

      {partiesEnCours.length > 0 && (
        <div className="grille-list__section">
          <p className="grille-list__section-title">Partie en cours - {partiesEnCours.length}</p>
          <ul className="grille-list">
            {partiesEnCours.map(({ grille, partie }) => (
              <PartieEnCoursCard
                key={partie.id}
                grille={grille}
                partie={partie}
                onRejoindrePartie={onRejoindrePartie}
                onDemanderCloture={handleDemanderCloture}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Section distincte de "Partie en cours" (Never de la spec : jamais fusionnée) —
          parties d'un autre créateur auxquelles ce compte participe, jamais de CTA
          Clôturer (PartieRejointeCard n'a par construction pas cette prop). Rendue
          indépendamment de `grilles.length` : un compte peut n'avoir créé aucune grille
          et pourtant participer à celle d'un autre. */}
      {partiesRejointes.length > 0 && (
        <div className="grille-list__section">
          <p className="grille-list__section-title">Parties auxquelles je participe - {partiesRejointes.length}</p>
          <ul className="grille-list">
            {partiesRejointes.map(({ grille, partie }) => (
              <PartieRejointeCard
                key={partie.id}
                grille={grille}
                partie={partie}
                onRejoindrePartie={onRejoindrePartie}
                onDupliquer={handleDupliquer}
                dupliquantEnCours={dupliquantIds.has(grille.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Le placeholder "crée ta première grille" ne doit s'afficher que si ce compte
          n'a vraiment aucune activité — ni grille possédée, ni partie rejointe chez un
          autre. Sinon (ex. un compte qui n'a créé aucune grille mais participe à celle
          d'un autre) il contredirait la section "Parties auxquelles je participe"
          juste au-dessus. */}
      {grilles.length === 0 && partiesRejointes.length === 0 && (
        <p className="bibliotheque-screen__subtitle">Crée ta première grille pour commencer !</p>
      )}
      {grilles.length > 0 && (
        <div className="grille-list__section">
          <p className="grille-list__section-title">Mes grilles - {grilles.length}</p>
          <ul className="grille-list">{grilles.map(renderGrilleCard)}</ul>
        </div>
      )}

      {message && <p className="bibliotheque-screen__message">{message}</p>}
      <Button type="button" variant="secondary" disabled={signingOut} onClick={handleSignOut}>
        Me déconnecter
      </Button>

      {confirmation && (
        <ConfirmDialog
          titre={confirmation.type === 'suppression' ? `Supprimer ${confirmation.grille.nom} ?` : 'Clôturer la partie ?'}
          message={
            confirmation.type === 'suppression'
              ? 'Cette grille sera définitivement supprimée.'
              : `Les joueurs de "${confirmation.grilleNom}" ne pourront plus rejoindre cette partie.`
          }
          confirmLabel={confirmation.type === 'suppression' ? 'Supprimer' : 'Clôturer'}
          confirmEnCours={confirmationEnCours}
          onConfirm={handleConfirmer}
          onCancel={handleAnnulerConfirmation}
        />
      )}
    </main>
  )
}
