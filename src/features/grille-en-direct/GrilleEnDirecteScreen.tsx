import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './GrilleEnDirecteScreen.scss'

type Joueur = {
  id: string
  pseudo: string
  partieId: string
}

type JoueurPartie = {
  id: string
  pseudo: string
}

type CaseJoueur = {
  id: string
  position: number
  checked: boolean
  phrase_id: string
  phrases: { texte: string } | null
}

type Vainqueur = {
  id: string
  pseudo: string
}

type StatutPartie = 'en_cours' | 'terminee'

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

const TOAST_DUREE_MS = 4000

type GrilleEnDirecteScreenProps = {
  joueur: Joueur
}

export function GrilleEnDirecteScreen({ joueur }: GrilleEnDirecteScreenProps) {
  const [cases, setCases] = useState<CaseJoueur[]>([])
  const [joueurs, setJoueurs] = useState<JoueurPartie[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [vainqueurs, setVainqueurs] = useState<Vainqueur[]>([])
  const [overlayFerme, setOverlayFerme] = useState(false)
  // Miroir des ids déjà connus, à jour de façon synchrone (contrairement à `vainqueurs`,
  // fermé sur sa valeur de montage dans le handler Realtime) : permet de distinguer un
  // véritable nouveau vainqueur d'un événement redélivré, sans rouvrir l'overlay à tort.
  const vainqueurIdsRef = useRef<Set<string>>(new Set())
  const [statutPartie, setStatutPartie] = useState<StatutPartie>('en_cours')
  const [estCreateur, setEstCreateur] = useState(false)
  const [clotureEnCours, setClotureEnCours] = useState(false)
  // Miroir synchrone de `joueurs`, même raison d'être que `vainqueurIdsRef` : les
  // handlers Realtime (toast de cochage, overlay de vainqueur) doivent résoudre un
  // pseudo à jour même pour un joueur arrivé après l'ouverture du canal — un `const`
  // fermé sur l'instantané chargé au montage ne le pourrait jamais.
  const joueursRef = useRef<JoueurPartie[]>([])

  function afficherToast(message: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DUREE_MS)
  }

  function resoudrePseudo(joueurId: string): string {
    return joueursRef.current.find((j) => j.id === joueurId)?.pseudo ?? 'Un joueur'
  }

  useEffect(() => {
    let ignore = false
    let channel: RealtimeChannel | undefined
    let chargeEnCours = false

    async function charger(silencieux: boolean) {
      if (chargeEnCours) return
      chargeEnCours = true

      // Un canal existant devenu obsolète après une coupure ne doit pas rester ouvert
      // en parallèle du nouveau (doublons d'événements, fuite de ressources) — le
      // retirer avant tout nouveau fetch, jamais après.
      if (channel) {
        supabase.removeChannel(channel)
        channel = undefined
      }

      if (!silencieux) {
        setChargement(true)
        setChargementEchoue(false)
      }

      try {
        const [casesResult, joueursResult, vainqueursResult, partieResult] = await Promise.all([
          supabase
            .from('cases')
            .select('id, position, checked, phrase_id, phrases(texte)')
            .eq('joueur_id', joueur.id)
            .order('position'),
          supabase
            .from('joueurs')
            .select('id, pseudo')
            .eq('partie_id', joueur.partieId)
            .order('created_at'),
          supabase
            .from('parties_vainqueurs')
            .select('joueur_id')
            .eq('partie_id', joueur.partieId)
            .order('declared_at'),
          supabase.from('parties').select('grille_id, statut').eq('id', joueur.partieId).single(),
        ])

        if (ignore) return

        const { data: casesData, error: casesError } = casesResult
        const { data: joueursData, error: joueursError } = joueursResult
        const { data: vainqueursData, error: vainqueursError } = vainqueursResult
        const { data: partieData, error: partieError } = partieResult

        // Un résultat vide ou non carré ne peut arriver qu'en contournant l'UI (la grille
        // source n'était pas complète au lancement de la partie) — traité comme un échec
        // de chargement plutôt qu'affiché tel quel (sinon `repeat(0, 1fr)` en CSS, écran vide
        // silencieux indiscernable d'un chargement bloqué). Seul l'échec des `cases` (l'essentiel,
        // AC #1) bloque l'écran ; un accroc sur la liste des joueurs (avatar-stack/toast
        // uniquement) dégrade en liste vide plutôt que d'empêcher d'afficher la grille.
        if (
          casesError ||
          !casesData ||
          casesData.length === 0 ||
          !Number.isInteger(Math.sqrt(casesData.length))
        ) {
          // Un rechargement silencieux (reconnexion) ne doit jamais faire apparaître
          // l'écran d'erreur — un casesError transitoire (ex. jeton en cours de
          // rafraîchissement juste après une coupure) ne signifie pas forcément une
          // vraie corruption de données ; l'utilisateur garde son dernier état connu.
          if (!silencieux) {
            setChargementEchoue(true)
          }
          return
        }

        const listeJoueurs = joueursError || !joueursData ? [] : joueursData
        // Avant tout appel à resoudrePseudo (y compris celui juste en dessous pour
        // vainqueursInitiaux) : le ref doit refléter ce chargement pour que la résolution
        // des vainqueurs déjà connus soit correcte dès ce même cycle.
        joueursRef.current = listeJoueurs

        const vainqueursInitiaux =
          vainqueursError || !vainqueursData
            ? []
            : vainqueursData.map((v) => ({ id: v.joueur_id, pseudo: resoudrePseudo(v.joueur_id) }))

        setCases(casesData as unknown as CaseJoueur[])
        setJoueurs(listeJoueurs)
        setVainqueurs(vainqueursInitiaux)
        // Un vainqueur apparu pendant une coupure (Realtime ne rejoue jamais les
        // événements manqués) doit rouvrir l'overlay s'il avait été fermé pour un
        // vainqueur précédent — sans quoi son annonce serait silencieusement perdue
        // (EXPERIENCE.md : "vainqueur déjà annoncé" fait partie de l'état à restaurer).
        // Au tout premier montage, vainqueurIdsRef est vide donc tout vainqueur compte
        // comme "nouveau" — sans effet visible puisque overlayFerme vaut déjà false.
        const idsAvant = vainqueurIdsRef.current
        const aDeNouveauxVainqueurs = vainqueursInitiaux.some((v) => !idsAvant.has(v.id))
        vainqueurIdsRef.current = new Set(vainqueursInitiaux.map((v) => v.id))
        if (aDeNouveauxVainqueurs) {
          setOverlayFerme(false)
        }
        setStatutPartie(partieError || !partieData ? 'en_cours' : partieData.statut)
        setChargementEchoue(false)

        // "Suis-je le créateur ?" : sous-produit direct de la policy select existante sur
        // grilles ("Créateur lit ses grilles", Story 1.2) — RLS renvoie une ligne si le
        // compte courant possède cette grille, null sinon. Aucune nouvelle policy/fonction
        // nécessaire. Séquentiel (dépend de grille_id ci-dessus), n'échoue jamais l'écran :
        // un échec réseau se traduit juste par l'absence du CTA de clôture (défaut sûr).
        if (!ignore && !partieError && partieData) {
          const { data: grilleData } = await supabase
            .from('grilles')
            .select('id')
            .eq('id', partieData.grille_id)
            .maybeSingle()
          if (!ignore) {
            setEstCreateur(Boolean(grilleData))
          }
        }

        // Le composant a pu se démonter (ou l'effet se relancer) pendant l'await
        // ci-dessus — sans cette garde, un canal serait créé et assigné après que le
        // nettoyage de l'effet a déjà tourné, fuite de connexion Realtime jamais retirée.
        if (ignore) return

        // Fetch-then-subscribe (AD-10) : le canal Realtime n'ouvre qu'après le chargement
        // complet réussi, à chaque appel de charger() — montage initial comme reconnexion
        // silencieuse (Story 2.6). Un seul canal, cinq écoutes — pas de filtre serveur par
        // partie_id/grille_id : les policies select scopent déjà la diffusion Realtime
        // elle-même (AD-7), un filtre applicatif reste nécessaire pour les cas où la RLS
        // couvre plusieurs parties d'un même utilisateur (voir gardes ci-dessous, Story 2.5).
        channel = supabase
          .channel(`partie:${joueur.partieId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'joueurs' },
            (payload) => {
              const nouveauJoueur = payload.new as { id: string; pseudo: string; partie_id: string }
              if (nouveauJoueur.partie_id !== joueur.partieId) return
              // Idempotence : un événement redélivré (reconnexion brève) ne doit pas
              // dupliquer l'entrée dans la pile d'avatars.
              if (joueursRef.current.some((j) => j.id === nouveauJoueur.id)) return
              const misAJour = [...joueursRef.current, { id: nouveauJoueur.id, pseudo: nouveauJoueur.pseudo }]
              joueursRef.current = misAJour
              setJoueurs(misAJour)
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'cases' },
            (payload) => {
              const nouvelleCase = payload.new as { joueur_id: string; checked: boolean }
              // Ne notifier que sur cochage (pas décochage) et jamais pour ses propres cases.
              if (!nouvelleCase.checked || nouvelleCase.joueur_id === joueur.id) return
              // Repli générique conservé en filet de sécurité (ex. écoute `joueurs` pas
              // encore établie au moment précis de l'événement) plutôt que d'abandonner
              // la notification en silence — `joueursRef` couvre le cas normal désormais.
              afficherToast(`${resoudrePseudo(nouvelleCase.joueur_id)} vient de cocher une Case.`)
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'phrases' },
            (payload) => {
              const phraseModifiee = payload.new as { id: string; texte: string }
              setCases((current) =>
                current.map((c) =>
                  c.phrase_id === phraseModifiee.id
                    ? { ...c, phrases: { texte: phraseModifiee.texte } }
                    : c,
                ),
              )
            },
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'parties_vainqueurs' },
            (payload) => {
              const nouveauVainqueur = payload.new as { joueur_id: string; partie_id: string }
              // Un créateur ayant plusieurs parties actives (ex. "Relancer") est, via la
              // policy "Créateur lit les vainqueurs de ses parties", abonné aux vainqueurs
              // de TOUTES ses parties — ignorer tout événement qui ne concerne pas celle
              // affichée à cet écran (revue de code, régression introduite par cette policy).
              if (nouveauVainqueur.partie_id !== joueur.partieId) return
              // Un vainqueur déjà connu (événement Realtime redélivré, ex. reconnexion
              // brève) ne doit pas rouvrir un overlay que le joueur venait de fermer.
              if (vainqueurIdsRef.current.has(nouveauVainqueur.joueur_id)) return
              vainqueurIdsRef.current.add(nouveauVainqueur.joueur_id)
              setVainqueurs((current) => [
                ...current,
                { id: nouveauVainqueur.joueur_id, pseudo: resoudrePseudo(nouveauVainqueur.joueur_id) },
              ])
              // Un joueur qui a fermé l'overlay pour un précédent vainqueur ne doit pas
              // manquer l'annonce d'un co-vainqueur réellement nouveau (UX-DR6).
              setOverlayFerme(false)
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'parties' },
            (payload) => {
              const partieMaj = payload.new as { id: string; statut: StatutPartie }
              // La policy "Créateur lit ses parties" scope la visibilité à TOUTES les
              // parties du créateur, pas seulement celle-ci — un créateur multi-parties
              // (ex. "Relancer") recevrait sinon le statut de la mauvaise partie.
              if (partieMaj.id !== joueur.partieId) return
              setStatutPartie(partieMaj.statut)
            },
          )
          .subscribe()
      } catch {
        // Un échec silencieux (reconnexion automatique) ne doit jamais faire
        // apparaître l'écran d'erreur — l'utilisateur garde son dernier état connu,
        // un prochain événement de reconnexion réessaiera (AC #2).
        if (!ignore && !silencieux) {
          setChargementEchoue(true)
        }
      } finally {
        chargeEnCours = false
        if (!ignore) {
          setChargement(false)
        }
      }
    }

    charger(false)

    // Reconnexion (AC #1 à #3) : rejoue le cycle fetch-then-subscribe silencieusement
    // dès que le réseau revient, ou dès que l'app redevient visible (téléphone
    // déverrouillé) — ce second signal couvre le cas le plus fréquent pour ce projet
    // mobile-first (NFR-2) : une mise en veille suspend généralement la connexion
    // WebSocket sans jamais faire basculer navigator.onLine à false. Volontairement
    // pas de 3e signal basé sur le statut du canal Realtime lui-même (redondant, cf.
    // Dev Notes de cette story).
    function handleReconnexion() {
      charger(true)
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        charger(true)
      }
    }
    window.addEventListener('online', handleReconnexion)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      ignore = true
      window.removeEventListener('online', handleReconnexion)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [joueur.id, joueur.partieId, retry])

  async function handleToggle(caseItem: CaseJoueur) {
    const nextChecked = !caseItem.checked
    setCases((current) =>
      current.map((c) => (c.id === caseItem.id ? { ...c, checked: nextChecked } : c)),
    )

    // `.select()` force la représentation de la ligne modifiée : un update filtré en
    // silence par RLS (ex. case déjà réassignée) renvoie un succès avec `data: []`,
    // sans `error` — sans ce `.select()`, ce cas ne serait jamais détecté ni annulé.
    const { data, error } = await supabase
      .from('cases')
      .update({ checked: nextChecked })
      .eq('id', caseItem.id)
      .select()

    if (error || !data || data.length === 0) {
      setCases((current) =>
        current.map((c) => (c.id === caseItem.id ? { ...c, checked: !nextChecked } : c)),
      )
    }
  }

  async function handleCloturer() {
    setClotureEnCours(true)
    try {
      // `.select()` force la représentation de la ligne modifiée : même piège que
      // `handleToggle` (Story 2.3) — un update filtré en silence par RLS renverrait
      // sinon un succès sans erreur, sans que la clôture n'ait réellement eu lieu.
      const { data, error } = await supabase
        .from('parties')
        .update({ statut: 'terminee' })
        .eq('id', joueur.partieId)
        .select()

      if (error || !data || data.length === 0) {
        afficherToast(friendlyErrorMessage())
        return
      }

      setStatutPartie('terminee')
    } catch {
      afficherToast(friendlyErrorMessage())
    } finally {
      setClotureEnCours(false)
    }
  }

  const cote = useMemo(() => Math.sqrt(cases.length), [cases.length])

  if (chargement) {
    return null
  }

  if (chargementEchoue) {
    return (
      <main className="grille-en-direct-screen">
        <p className="grille-en-direct-screen__message">{friendlyErrorMessage()}</p>
        <Button type="button" variant="primary" onClick={() => setRetry((n) => n + 1)}>
          Réessayer
        </Button>
      </main>
    )
  }

  const estTerminee = statutPartie === 'terminee'

  return (
    <main className="grille-en-direct-screen">
      <div className="grille-en-direct-screen__header">
        {estTerminee ? <PartieTermineeBadge /> : <LiveBadge />}
        <AvatarStack joueurs={joueurs} />
      </div>

      <p className="grille-en-direct-screen__subtitle">Tu joues sous le nom {joueur.pseudo}</p>

      <div
        className="grille-en-direct-screen__grille"
        style={{ gridTemplateColumns: `repeat(${cote}, 1fr)` }}
      >
        {cases.map((caseItem) => (
          <GridCell key={caseItem.id} caseItem={caseItem} onToggle={handleToggle} disabled={estTerminee} />
        ))}
      </div>

      {toast && <p className="toast">{toast}</p>}

      {vainqueurs.length > 0 && !overlayFerme && (
        <VainqueurOverlay vainqueurs={vainqueurs} onFermer={() => setOverlayFerme(true)} />
      )}

      {estCreateur && !estTerminee && (
        <Button type="button" variant="close-game" disabled={clotureEnCours} onClick={handleCloturer}>
          Clôturer la Partie
        </Button>
      )}
    </main>
  )
}

type GridCellProps = {
  caseItem: CaseJoueur
  onToggle: (caseItem: CaseJoueur) => void
  disabled: boolean
}

function GridCell({ caseItem, onToggle, disabled }: GridCellProps) {
  // Rotation et rayons de coin calculés une seule fois par case (DESIGN.md §Shapes) :
  // ne jamais recalculer à chaque rendu, sinon les cases tremblent visuellement.
  // Deps vide assumé : ce composant est monté avec `key={caseItem.id}` par son parent,
  // donc une nouvelle instance (et un nouveau calcul) n'existe que pour une nouvelle case.
  const style = useMemo(() => {
    const rotation = (Math.random() * 2.4 - 1.2).toFixed(2)
    const rayon = () => Math.round(9 + Math.random() * 6)
    return {
      transform: `rotate(${rotation}deg)`,
      borderRadius: `${rayon()}px ${rayon()}px ${rayon()}px ${rayon()}px`,
    }
  }, [])

  return (
    <button
      type="button"
      className="grid-cell"
      style={style}
      aria-pressed={caseItem.checked}
      disabled={disabled}
      onClick={() => onToggle(caseItem)}
    >
      <span className="grid-cell__texte">{caseItem.phrases?.texte}</span>
      {caseItem.checked && <span className="grid-cell__coche">✓</span>}
    </button>
  )
}

function PartieTermineeBadge() {
  return <span className="partie-terminee-badge">Partie terminée</span>
}

function LiveBadge() {
  return (
    <span className="live-badge">
      <span className="live-badge__point" />
      En direct
    </span>
  )
}

const COULEURS_AVATAR = ['terracotta', 'sage', 'mustard']

type AvatarStackProps = {
  joueurs: JoueurPartie[]
}

function AvatarStack({ joueurs }: AvatarStackProps) {
  const visibles = joueurs.slice(0, 3)
  const reste = joueurs.length - visibles.length

  return (
    <div className="avatar-stack">
      {visibles.map((j, index) => (
        <span
          key={j.id}
          className={`avatar-stack__avatar avatar-stack__avatar--${COULEURS_AVATAR[index % COULEURS_AVATAR.length]}`}
        >
          {Array.from(j.pseudo)[0]?.toUpperCase()}
        </span>
      ))}
      {reste > 0 && <span className="avatar-stack__compteur">+{reste}</span>}
    </div>
  )
}

function formatNomsVainqueurs(pseudos: string[]): string {
  if (pseudos.length === 1) return pseudos[0]
  return `${pseudos.slice(0, -1).join(', ')} et ${pseudos[pseudos.length - 1]}`
}

type VainqueurOverlayProps = {
  vainqueurs: Vainqueur[]
  onFermer: () => void
}

function VainqueurOverlay({ vainqueurs, onFermer }: VainqueurOverlayProps) {
  const label = vainqueurs.length === 1 ? 'Vainqueur' : 'Vainqueurs'
  const noms = formatNomsVainqueurs(vainqueurs.map((v) => v.pseudo))

  return (
    <div className="vainqueur-overlay">
      <p className="vainqueur-overlay__texte">
        {label} : {noms} 🎉
      </p>
      <Button type="button" variant="secondary" onClick={onFermer}>
        Fermer
      </Button>
    </div>
  )
}
