import { Button } from '../../../components/Button'
import type { Grille, PartieActive } from '../types'
import { construireLienPartie } from '../utils'
import { PartieLienCard } from './PartieLienCard'

type GrilleCardProps = {
  grille: Grille
  lienPartie: string | undefined
  liensCopies: Set<string>
  partiesActives: PartieActive[]
  lancementEnCours: boolean
  dupliquantEnCours: boolean
  confirmationSuppression: boolean
  suppressionEnCours: boolean
  clotureEnAttenteIds: Set<string>
  onModifierGrille: (grille: { id: string; nom: string; taille: number }) => void
  onRelancer: (grille: Grille) => void
  onDupliquer: (grille: Grille) => void
  onDemanderSuppression: (grilleId: string) => void
  onAnnulerSuppression: (grilleId: string) => void
  onSupprimer: (grille: Grille) => void
  onCopierLien: (id: string, lien: string) => void
  onCloturerEnAttente: (partieId: string) => void
}

export function GrilleCard({
  grille,
  lienPartie,
  liensCopies,
  partiesActives,
  lancementEnCours,
  dupliquantEnCours,
  confirmationSuppression,
  suppressionEnCours,
  clotureEnAttenteIds,
  onModifierGrille,
  onRelancer,
  onDupliquer,
  onDemanderSuppression,
  onAnnulerSuppression,
  onSupprimer,
  onCopierLien,
  onCloturerEnAttente,
}: GrilleCardProps) {
  return (
    <li className="card grille-list__item">
      <div className="grille-list__row">
        <span className="grille-list__nom">{grille.nom}</span>
        {partiesActives.length > 0 ? (
          <span className="status-chip">
            <span className="status-chip__dot" />
            En cours
          </span>
        ) : (
          <span className="grille-list__taille">
            {grille.taille}×{grille.taille}
          </span>
        )}
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
        {confirmationSuppression ? (
          <>
            <Button
              type="button"
              variant="close-game"
              aria-label={`Confirmer la suppression de ${grille.nom}`}
              disabled={suppressionEnCours}
              onClick={() => onSupprimer(grille)}
            >
              Confirmer la suppression ?
            </Button>
            <Button
              type="button"
              variant="secondary"
              aria-label={`Annuler la suppression de ${grille.nom}`}
              onClick={() => onAnnulerSuppression(grille.id)}
            >
              Annuler
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="close-game"
            aria-label={`Supprimer ${grille.nom}`}
            onClick={() => onDemanderSuppression(grille.id)}
          >
            Supprimer
          </Button>
        )}
      </div>
      {lienPartie && (
        <div className="card card--accent-sage grille-list__partie">
          <p className="grille-list__partie-titre">Ta partie est prête ! Partage ce lien :</p>
          <PartieLienCard
            id={grille.id}
            lien={lienPartie}
            lienCopie={liensCopies.has(grille.id)}
            onCopierLien={onCopierLien}
          />
        </div>
      )}
      {partiesActives.map((partie) => (
        <div key={partie.id} className="card card--accent-sage grille-list__partie">
          <p className="grille-list__partie-titre">
            {partie.nombreJoueurs} joueur{partie.nombreJoueurs > 1 ? 's' : ''}
            {partie.vainqueurs.length > 0 && <> — Vainqueur : {partie.vainqueurs.join(', ')}</>}
          </p>
          <PartieLienCard
            id={partie.id}
            lien={construireLienPartie(partie.codePartie)}
            lienCopie={liensCopies.has(partie.id)}
            onCopierLien={onCopierLien}
            onCloturer={onCloturerEnAttente}
            clotureEnCours={clotureEnAttenteIds.has(partie.id)}
          />
        </div>
      ))}
    </li>
  )
}
