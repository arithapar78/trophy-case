import { useEffect } from 'react'
import CloseButton from './CloseButton'

interface Props {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl bg-surface p-5 text-ink shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
          <CloseButton onClose={onCancel} />
        </div>
        <p className="mt-2 opacity-80">{message}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-ink/20 py-3">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 py-3 text-white">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
