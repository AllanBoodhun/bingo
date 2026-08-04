import { useMemo } from 'react'
import { Button } from '../../components/Button'
import { GridCell, type CaseGrille } from '../../components/GridCell'
import type { JoueurPartie } from './GrilleEnDirecteScreen'
import './GrilleEnDirecteScreen.scss'

function friendlyErrorMessage(): string {
  return 'Un souci est survenu, réessaie dans un instant.'
}

type GrilleAdversaireScreenProps = {
  joueur: JoueurPartie
  cases: CaseGrille[]
  chargement: boolean
  erreur: boolean
  onRetour: () => void
}

// Écran de consultation en lecture seule de la grille d'un autre joueur (clic sur son
// avatar dans `AvatarStack`). Pas de `<main>` propre : rendu à l'intérieur du `<main>`
// de `GrilleEnDirecteScreen`, qui garde son header (avatar-stack, badge), son toast et
// son overlay vainqueur affichés normalement pendant la consultation (boundary "Never"
// de la spec : pas de badge dupliqué sur cet écran).
export function GrilleAdversaireScreen({ joueur, cases, chargement, erreur, onRetour }: GrilleAdversaireScreenProps) {
  const cote = useMemo(() => Math.sqrt(cases.length), [cases.length])

  return (
    <>
      <div className="grille-adversaire__header">
        <p className="grille-en-direct-screen__subtitle">Grille de {joueur.pseudo}</p>
        <Button type="button" variant="secondary" onClick={onRetour}>
          Retour
        </Button>
      </div>

      {erreur && <p className="grille-en-direct-screen__message">{friendlyErrorMessage()}</p>}

      {chargement && <p className="grille-en-direct-screen__message">Chargement de la grille…</p>}

      {!chargement && !erreur && (
        <div
          className="grille-en-direct-screen__grille"
          style={{ gridTemplateColumns: `repeat(${cote}, 1fr)` }}
        >
          {cases.map((caseItem) => (
            // Aucun `onToggle` réel possible : `disabled` bloque nativement le clic (et,
            // avec lui, le long-press de révélation du texte tronqué — limitation acceptée
            // en lecture seule, boundary "Never" de la spec) avant même que ce no-op
            // n'entre en jeu.
            <GridCell key={caseItem.id} caseItem={caseItem} onToggle={() => {}} disabled />
          ))}
        </div>
      )}
    </>
  )
}
