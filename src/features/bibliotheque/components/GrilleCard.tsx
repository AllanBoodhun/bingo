import { Button } from '../../../components/Button'
import type { Grille } from '../types'

type GrilleCardProps = {
  grille: Grille
  lancementEnCours: boolean
  dupliquantEnCours: boolean
  onModifierGrille: (grille: { id: string; nom: string; taille: number }) => void
  onRelancer: (grille: Grille) => void
  onDupliquer: (grille: Grille) => void
  onDemanderSuppression: (grille: Grille) => void
}

export function GrilleCard({
  grille,
  lancementEnCours,
  dupliquantEnCours,
  onModifierGrille,
  onRelancer,
  onDupliquer,
  onDemanderSuppression,
}: GrilleCardProps) {
  return (
    <li className="card grille-list__item">
      <div className="grille-list__row">
        <span className="grille-list__nom">{grille.nom}</span>
        <span className="grille-list__taille">
          {grille.taille}×{grille.taille}
        </span>
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
              disabled={lancementEnCours}
              onClick={() => onRelancer(grille)}
            >
              Relancer
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
          </>
        )}
        <Button
          type="button"
          variant="close-game"
          aria-label={`Supprimer ${grille.nom}`}
          onClick={() => onDemanderSuppression(grille)}
        >
          Supprimer
        </Button>
      </div>
    </li>
  )
}
