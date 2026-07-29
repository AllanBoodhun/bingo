import { Button } from '../../../components/Button'
import type { Grille, PartieActive } from '../types'

type PartieRejointeCardProps = {
  grille: Grille
  partie: PartieActive
  onRejoindrePartie: (grille: Grille, partie: PartieActive) => void
  onDupliquer: (grille: Grille) => void
  dupliquantEnCours: boolean
}

// Structure JSX/CSS volontairement dupliquée depuis PartieEnCoursCard plutôt que
// factorisée (convention déjà établie sur ce projet) — mais sans prop de clôture :
// un joueur non-créateur ne doit jamais voir de CTA Clôturer/Modifier, garanti ici par
// construction (la prop n'existe pas) plutôt que par un masquage conditionnel qui
// pourrait un jour être contourné par erreur.
export function PartieRejointeCard({
  grille,
  partie,
  onRejoindrePartie,
  onDupliquer,
  dupliquantEnCours,
}: PartieRejointeCardProps) {
  const estTerminee = partie.vainqueurs.length > 0

  return (
    <li className="card card--accent-sage grille-list__item">
      <div className="grille-list__row">
        <span className="grille-list__nom">{grille.nom}</span>
        <span className="status-chip">
          <span className="status-chip__dot" />
          {estTerminee ? 'Terminée' : 'En cours'}
        </span>
      </div>
      <div className="grille-list__row">
        <span className="grille-list__taille">
          {grille.taille}×{grille.taille} - {partie.nombreJoueurs} joueur{partie.nombreJoueurs > 1 ? 's' : ''}
        </span>
        {estTerminee && (
          <span className="grille-list__taille">
            Vainqueur : <strong>{partie.vainqueurs.join(', ')}</strong>
          </span>
        )}
      </div>
      <div className="grille-list__actions">
        <Button
          type="button"
          variant="primary"
          aria-label={`Rejoindre la partie de ${grille.nom}`}
          onClick={() => onRejoindrePartie(grille, partie)}
        >
          Rejoindre
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Dupliquer ${grille.nom}`}
          disabled={dupliquantEnCours}
          onClick={() => onDupliquer(grille)}
        >
          Dupliquer
        </Button>
      </div>
    </li>
  )
}
