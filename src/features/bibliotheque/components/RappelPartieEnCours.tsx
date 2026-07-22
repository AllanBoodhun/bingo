import type { PartieEnAttente } from '../types'
import { PartieLienCard } from './PartieLienCard'

type RappelPartieEnCoursProps = {
  parties: PartieEnAttente[]
  liensCopies: Set<string>
  onCopierLien: (partieId: string, lien: string) => void
  clotureEnAttenteIds: Set<string>
  onCloturer: (partieId: string) => void
}

export function RappelPartieEnCours({
  parties,
  liensCopies,
  onCopierLien,
  clotureEnAttenteIds,
  onCloturer,
}: RappelPartieEnCoursProps) {
  return (
    <div className="card card--accent-sage bibliotheque-screen__rappel">
      <p className="bibliotheque-screen__rappel-titre">
        Une Partie est toujours en cours — tu veux la clôturer ?
      </p>
      {parties.map((partie) => (
        <div key={partie.id} className="bibliotheque-screen__rappel-item">
          <span className="grille-list__nom">{partie.nom}</span>
          <PartieLienCard
            id={partie.id}
            lien={partie.lien}
            lienCopie={liensCopies.has(partie.id)}
            onCopierLien={onCopierLien}
            onCloturer={onCloturer}
            clotureEnCours={clotureEnAttenteIds.has(partie.id)}
            actionsClassName="grille-list__actions"
          />
        </div>
      ))}
    </div>
  )
}
