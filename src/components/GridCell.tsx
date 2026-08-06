import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

// Forme générique d'une case de grille, partagée par tout écran qui affiche une grille
// (jeu en direct ou consultation en lecture seule d'un autre joueur) : le nom volontairement
// neutre (pas "CaseJoueur") reflète que cette case n'appartient pas forcément au joueur courant.
export type CaseGrille = {
  id: string
  position: number
  checked: boolean
  phrase_id: string
  phrases: { texte: string } | null
}

type GridCellProps = {
  caseItem: CaseGrille
  onToggle: (caseItem: CaseGrille) => void
  disabled: boolean
}

// Durée de l'appui long avant ouverture de la bulle (EXPERIENCE.md §Interaction
// Primitives) — aussi calée comme durée de la transition CSS de `.grid-cell--en-appui`
// pour que le feedback progressif arrive à son terme visuel pile au moment du seuil.
const APPUI_LONG_MS = 450
const MARGE_ECRAN_PX = 20

type BullePosition = { top: number; left: number }

export function GridCell({ caseItem, onToggle, disabled }: GridCellProps) {
  // Rotation et rayons de coin calculés une seule fois par case (DESIGN.md §Shapes) :
  // ne jamais recalculer à chaque rendu, sinon les cases tremblent visuellement.
  // Deps vide assumé : ce composant est monté avec `key={caseItem.id}` par son parent,
  // donc une nouvelle instance (et un nouveau calcul) n'existe que pour une nouvelle case.
  // La rotation passe par une custom property plutôt qu'un `transform` direct : la classe
  // `.grid-cell--en-appui` (feedback d'appui) doit composer son propre `scale()` par-dessus
  // cette même rotation, ce qu'un `transform` inline figé rendrait impossible à surcharger
  // depuis une classe CSS (l'inline style gagne toujours sur une règle de classe).
  const style = useMemo(() => {
    const rotation = (Math.random() * 2.4 - 1.2).toFixed(2)
    const rayon = () => Math.round(9 + Math.random() * 6)
    return {
      '--grid-cell-rotation': `${rotation}deg`,
      borderRadius: `${rayon()}px ${rayon()}px ${rayon()}px ${rayon()}px`,
    } as CSSProperties
  }, [])

  const boutonRef = useRef<HTMLButtonElement>(null)
  const texteRef = useRef<HTMLSpanElement>(null)
  const bulleRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Consommé par le `onClick` natif (qui suit toujours le `pointerup`) pour empêcher le
  // toggle après un appui long réussi ; remis à `false` dès le DÉBUT de chaque nouveau
  // `onPointerDown` (voir Design Notes de la spec) — jamais seulement à sa consommation
  // par `onClick`, sinon un pointeur qui quitte l'élément sans jamais déclencher de
  // `click` laisserait le flag bloqué à `true` indéfiniment.
  const supprimerToggleRef = useRef(false)

  const [tronque, setTronque] = useState(false)
  const [enAppui, setEnAppui] = useState(false)
  const [bulleOuverte, setBulleOuverte] = useState(false)
  const [bullePosition, setBullePosition] = useState<BullePosition | null>(null)

  // Pas de moyen CSS pur pour savoir si `line-clamp` a effectivement tronqué le texte —
  // comparaison scrollHeight/clientHeight, recalculée via ResizeObserver (case dimensionnée
  // en `1fr`/`aspect-ratio`, sensible à la taille d'écran) et sur changement du texte
  // lui-même : FR-3 permet au créateur d'éditer une phrase pendant une partie active, donc
  // `caseItem.phrases?.texte` peut changer sans qu'aucun resize ne se produise.
  useLayoutEffect(() => {
    const element = texteRef.current
    if (!element) return

    function mesurer() {
      if (!element) return
      setTronque(element.scrollHeight > element.clientHeight + 1)
    }

    mesurer()
    const observer = new ResizeObserver(mesurer)
    observer.observe(element)
    return () => observer.disconnect()
  }, [caseItem.phrases?.texte])

  // Le timer d'appui long ne doit jamais survivre au démontage du composant (case
  // retirée de la grille pendant l'attente des 450ms) — sans ce nettoyage, le callback
  // ouvrirait une bulle pour un bouton qui n'existe plus.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  // Positionnement de la bulle hors du bouton pivoté (voir Design Notes, changement
  // d'approche itération 2) : mesure réelle après un premier rendu invisible plutôt
  // qu'une largeur estimée, pour clamper correctement même les textes legacy très longs.
  useLayoutEffect(() => {
    if (!bulleOuverte) {
      setBullePosition(null)
      return
    }
    const bouton = boutonRef.current
    const bulle = bulleRef.current
    if (!bouton || !bulle) return

    const rectBouton = bouton.getBoundingClientRect()
    const rectBulle = bulle.getBoundingClientRect()

    let left = rectBouton.left + rectBouton.width / 2 - rectBulle.width / 2
    left = Math.max(MARGE_ECRAN_PX, Math.min(left, window.innerWidth - rectBulle.width - MARGE_ECRAN_PX))

    const espaceAuDessus = rectBouton.top
    const espaceEnDessous = window.innerHeight - rectBouton.bottom
    const placerAuDessus = espaceAuDessus >= rectBulle.height + 8 || espaceAuDessus > espaceEnDessous
    const top = placerAuDessus ? rectBouton.top - rectBulle.height - 8 : rectBouton.bottom + 8

    setBullePosition({ top, left })
  }, [bulleOuverte])

  // Un resize/rotation d'écran invalide la position déjà calculée (colonne de bord qui
  // change de marge disponible) — fermer plutôt que de laisser une bulle mal positionnée.
  useEffect(() => {
    if (!bulleOuverte) return
    function handleResize() {
      setBulleOuverte(false)
      setEnAppui(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [bulleOuverte])

  // Tap ailleurs à l'écran ferme la bulle sans déclencher de toggle. La bulle est rendue
  // via portail (hors de `boutonRef`), donc un pointerdown sur la bulle elle-même passe
  // aussi cette condition et la ferme normalement — cohérent avec le fait qu'elle capte
  // désormais le tap nativement (pas de `pointer-events: none`, voir GrilleEnDirecteScreen.scss).
  useEffect(() => {
    if (!bulleOuverte) return
    function handlePointerDownDehors(event: PointerEvent) {
      if (boutonRef.current?.contains(event.target as Node)) return
      setBulleOuverte(false)
      setEnAppui(false)
    }
    document.addEventListener('pointerdown', handlePointerDownDehors)
    return () => document.removeEventListener('pointerdown', handlePointerDownDehors)
  }, [bulleOuverte])

  function annulerAppui() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setEnAppui(false)
    setBulleOuverte(false)
  }

  function handlePointerDown() {
    supprimerToggleRef.current = false
    if (disabled || !tronque) return
    // Nettoyer un timer déjà en cours (deux pointeurs sur la même case sans `pointerup`
    // intermédiaire) : sinon l'ancien timer devient orphelin, non annulable par les
    // handlers suivants qui n'agissent que sur le nouveau `timerRef.current`, et peut
    // rouvrir la bulle bien après la fin perçue de l'interaction.
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    setEnAppui(true)
    timerRef.current = setTimeout(() => {
      supprimerToggleRef.current = true
      setBulleOuverte(true)
    }, APPUI_LONG_MS)
  }

  function handleClick() {
    if (supprimerToggleRef.current) {
      supprimerToggleRef.current = false
      return
    }
    onToggle(caseItem)
  }

  return (
    <>
      <button
        ref={boutonRef}
        type="button"
        className={[
          'grid-cell',
          enAppui ? 'grid-cell--en-appui' : '',
          caseItem.checked ? 'grid-cell--checked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
        aria-pressed={caseItem.checked}
        disabled={disabled}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={annulerAppui}
        onPointerLeave={annulerAppui}
        onPointerCancel={annulerAppui}
      >
        <span ref={texteRef} className="grid-cell__texte">{caseItem.phrases?.texte}</span>
      </button>
      {bulleOuverte &&
        createPortal(
          <div
            ref={bulleRef}
            className="text-reveal-bubble"
            style={
              bullePosition
                ? { top: bullePosition.top, left: bullePosition.left, visibility: 'visible' }
                : { top: 0, left: 0, visibility: 'hidden' }
            }
          >
            {caseItem.phrases?.texte}
          </div>,
          document.body,
        )}
    </>
  )
}
