import { Button } from "../../../components/Button";
import type { Grille } from "../types";

type GrilleCardProps = {
  grille: Grille;
  lancementEnCours: boolean;
  dupliquantEnCours: boolean;
  onModifierGrille: (grille: {
    id: string;
    nom: string;
    taille: number;
  }) => void;
  onRelancer: (grille: Grille) => void;
  onDupliquer: (grille: Grille) => void;
  onDemanderSuppression: (grille: Grille) => void;
};

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
    <li className="card card__grille">
      <div className="card__row">
        <span className="card__nom">{grille.nom}</span>
        <span className="card__taille">
          {grille.taille}×{grille.taille}
        </span>
      </div>
      <div className="card__actions">
        {grille.validee && (
          <>
            <Button
              type="button"
              variant="secondary"
              color="filledRed"
              aria-label={`Relancer ${grille.nom}`}
              disabled={lancementEnCours}
              onClick={() => onRelancer(grille)}
            >
              Relancer
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="secondary"
          color="outlinedWhite"
          aria-label={`Modifier ${grille.nom}`}
          onClick={() =>
            onModifierGrille({
              id: grille.id,
              nom: grille.nom,
              taille: grille.taille,
            })
          }
        >
          Modifier
        </Button>

        <Button
          type="button"
          variant="secondary"
          color="filledBlack"
          aria-label={`Supprimer ${grille.nom}`}
          onClick={() => onDemanderSuppression(grille)}
        >
          Supprimer
        </Button>
      </div>
    </li>
  );
}
