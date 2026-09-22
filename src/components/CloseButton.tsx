interface Props {
  onClose: () => void
  label?: string
}

// The X in the corner of every popup. The sheets are taller than a phone
// screen, so the Cancel and Done buttons at the bottom are often scrolled
// out of sight. This one always stays where a thumb can reach it.
export default function CloseButton({ onClose, label = 'Close' }: Props) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      data-testid="close-button"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition-colors hover:bg-ink/5 active:bg-ink/10"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  )
}
