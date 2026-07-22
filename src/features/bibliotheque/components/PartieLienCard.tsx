import { Button } from '../../../components/Button'

type PartieLienCardProps = {
  id: string
  lien: string
  lienCopie: boolean
  onCopierLien: (id: string, lien: string) => void
  onCloturer?: (id: string) => void
  clotureEnCours?: boolean
  actionsClassName?: string
}

export function PartieLienCard({
  id,
  lien,
  lienCopie,
  onCopierLien,
  onCloturer,
  clotureEnCours,
  actionsClassName,
}: PartieLienCardProps) {
  const actions = (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => {
          window.location.href = lien
        }}
      >
        Rejoindre maintenant
      </Button>
      <Button type="button" variant="secondary" onClick={() => onCopierLien(id, lien)}>
        {lienCopie ? 'Lien copié !' : 'Copier le lien'}
      </Button>
      {onCloturer && (
        <Button type="button" variant="close-game" disabled={clotureEnCours} onClick={() => onCloturer(id)}>
          Clôturer la Partie
        </Button>
      )}
    </>
  )

  return (
    <>
      <p className="grille-list__lien">{lien}</p>
      {actionsClassName ? <div className={actionsClassName}>{actions}</div> : actions}
    </>
  )
}
