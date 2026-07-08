import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../components/Button'
import './GrilleEnDirecteScreen.css'

type Joueur = {
  id: string
  pseudo: string
}

type CaseJoueur = {
  id: string
  position: number
  checked: boolean
  phrases: { texte: string } | null
}

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

type GrilleEnDirecteScreenProps = {
  joueur: Joueur
}

export function GrilleEnDirecteScreen({ joueur }: GrilleEnDirecteScreenProps) {
  const [cases, setCases] = useState<CaseJoueur[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let ignore = false

    setChargement(true)
    setChargementEchoue(false)

    async function charger() {
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('id, position, checked, phrases(texte)')
          .eq('joueur_id', joueur.id)
          .order('position')

        if (ignore) return

        // Un résultat vide ou non carré ne peut arriver qu'en contournant l'UI (la grille
        // source n'était pas complète au lancement de la partie) — traité comme un échec
        // de chargement plutôt qu'affiché tel quel (sinon `repeat(0, 1fr)` en CSS, écran vide
        // silencieux indiscernable d'un chargement bloqué).
        if (error || !data || data.length === 0 || !Number.isInteger(Math.sqrt(data.length))) {
          setChargementEchoue(true)
        } else {
          setCases(data as unknown as CaseJoueur[])
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
  }, [joueur.id, retry])

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
      <p className="grille-en-direct-screen__subtitle">Tu joues sous le nom {joueur.pseudo}</p>

      <div
        className="grille-en-direct-screen__grille"
        style={{ gridTemplateColumns: `repeat(${cote}, 1fr)` }}
      >
        {cases.map((caseItem) => (
          <GridCell key={caseItem.id} caseItem={caseItem} />
        ))}
      </div>
    </main>
  )
}

type GridCellProps = {
  caseItem: CaseJoueur
}

function GridCell({ caseItem }: GridCellProps) {
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
    <div className="grid-cell" style={style}>
      <span className="grid-cell__texte">{caseItem.phrases?.texte}</span>
    </div>
  )
}
