import { Button } from '../../../components/Button'
import type { Grille, PartieActive } from '../types'

type PartieEnCoursCardProps = {
  grille: Grille
  partie: PartieActive
  onRejoindrePartie: (grille: Grille, partie: PartieActive) => void
  onDemanderCloture: (partieId: string, grilleNom: string) => void
}

export function PartieEnCoursCard({
  grille,
  partie,
  onRejoindrePartie,
  onDemanderCloture,
}: PartieEnCoursCardProps) {
  const estTerminee = partie.vainqueurs.length > 0

  return (
    <li className="card card__en-cours">
      <div className="card__row">
        <span className="card__nom">{grille.nom}</span>
        <span className="status-chip">
          <span className="status-chip__dot" />
          {estTerminee ? 'Terminée' : 'En cours'}
        </span>
      </div>
      <div className="card__row">
        <span className="card__taille">
          {grille.taille}×{grille.taille} - {partie.nombreJoueurs} joueur{partie.nombreJoueurs > 1 ? 's' : ''}
        </span>
        {estTerminee && (
          <span className="card__taille">
            Vainqueur : <strong>{partie.vainqueurs.join(', ')}</strong>
          </span>
        )}
      </div>
      <div className="card__actions">
        <Button
          type="button"
          variant="secondary"
          color="filledRed"
          aria-label={`Rejoindre la partie de ${grille.nom}`}
          onClick={() => onRejoindrePartie(grille, partie)}
        >
          Rejoindre
        </Button>
        <Button
          type="button"
          variant="secondary"
          color="filledBlack"
          aria-label={`Clôturer la partie de ${grille.nom}`}
          onClick={() => onDemanderCloture(partie.id, grille.nom)}
        >
          Clôturer
        </Button>
      </div>
    </li>
  )
}
