import { useEffect } from 'react'
import { Button } from './Button'

type ConfirmDialogProps = {
  titre: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  confirmEnCours?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  titre,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  confirmEnCours = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="card confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titre"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="confirm-dialog__titre" id="confirm-dialog-titre">
          {titre}
        </p>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <Button type="button" variant="secondary" color='filledRed' disabled={confirmEnCours} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="secondary" color='outlinedWhite' disabled={confirmEnCours} onClick={onCancel}>
            {cancelLabel}
          </Button>

        </div>
      </div>
    </div>
  )
}
