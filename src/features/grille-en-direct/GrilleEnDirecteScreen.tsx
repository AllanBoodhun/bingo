import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './GrilleEnDirecteScreen.css'

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

  function afficherToast(message: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DUREE_MS)
  }

  useEffect(() => {
    let ignore = false
    let channel: RealtimeChannel | undefined

    setChargement(true)
    setChargementEchoue(false)

    async function charger() {
      try {
        const [casesResult, joueursResult, vainqueursResult] = await Promise.all([
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
        ])

        if (ignore) return

        const { data: casesData, error: casesError } = casesResult
        const { data: joueursData, error: joueursError } = joueursResult
        const { data: vainqueursData, error: vainqueursError } = vainqueursResult

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
          setChargementEchoue(true)
          return
        }

        const listeJoueurs = joueursError || !joueursData ? [] : joueursData

        function resoudrePseudo(joueurId: string): string {
          return listeJoueurs.find((j) => j.id === joueurId)?.pseudo ?? 'Un joueur'
        }

        const vainqueursInitiaux =
          vainqueursError || !vainqueursData
            ? []
            : vainqueursData.map((v) => ({ id: v.joueur_id, pseudo: resoudrePseudo(v.joueur_id) }))

        setCases(casesData as unknown as CaseJoueur[])
        setJoueurs(listeJoueurs)
        setVainqueurs(vainqueursInitiaux)
        vainqueurIdsRef.current = new Set(vainqueursInitiaux.map((v) => v.id))

        // Fetch-then-subscribe : le canal Realtime n'ouvre qu'après le chargement initial
        // réussi (même discipline que celle qu'imposera AD-10 en Story 2.6). Un seul canal,
        // trois écoutes (cases, phrases, parties_vainqueurs) — pas de filtre serveur par
        // partie_id/grille_id : les policies select (Story 2.2, cette story) scopent déjà
        // la diffusion Realtime elle-même (AD-7), aucun filtre supplémentaire n'est nécessaire.
        channel = supabase
          .channel(`partie:${joueur.partieId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'cases' },
            (payload) => {
              const nouvelleCase = payload.new as { joueur_id: string; checked: boolean }
              // Ne notifier que sur cochage (pas décochage) et jamais pour ses propres cases.
              if (!nouvelleCase.checked || nouvelleCase.joueur_id === joueur.id) return
              // Repli générique si le pseudo n'est pas dans l'instantané chargé au montage
              // (joueur arrivé après coup — `joueurs` n'est délibérément pas temps réel, AD-7) :
              // la notification reste affichée plutôt que d'être abandonnée en silence.
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
              const nouveauVainqueur = payload.new as { joueur_id: string }
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
          .subscribe()
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

  return (
    <main className="grille-en-direct-screen">
      <div className="grille-en-direct-screen__header">
        <LiveBadge />
        <AvatarStack joueurs={joueurs} />
      </div>

      <p className="grille-en-direct-screen__subtitle">Tu joues sous le nom {joueur.pseudo}</p>

      <div
        className="grille-en-direct-screen__grille"
        style={{ gridTemplateColumns: `repeat(${cote}, 1fr)` }}
      >
        {cases.map((caseItem) => (
          <GridCell key={caseItem.id} caseItem={caseItem} onToggle={handleToggle} />
        ))}
      </div>

      {toast && <p className="toast">{toast}</p>}

      {vainqueurs.length > 0 && !overlayFerme && (
        <VainqueurOverlay vainqueurs={vainqueurs} onFermer={() => setOverlayFerme(true)} />
      )}
    </main>
  )
}

type GridCellProps = {
  caseItem: CaseJoueur
  onToggle: (caseItem: CaseJoueur) => void
}

function GridCell({ caseItem, onToggle }: GridCellProps) {
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
      onClick={() => onToggle(caseItem)}
    >
      <span className="grid-cell__texte">{caseItem.phrases?.texte}</span>
      {caseItem.checked && <span className="grid-cell__coche">✓</span>}
    </button>
  )
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
