import { useRef } from 'react'

interface Props {
  onPhoto: (file: File) => void
  onAddWithoutPhoto: () => void
}

// The big round button at the bottom of the screen. It clicks a hidden file
// input: on a phone that opens the camera, on a laptop the file picker.
export default function CameraButton({ onPhoto, onAddWithoutPhoto }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col-reverse items-center gap-3 bg-gradient-to-t from-page via-page/90 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
      <button
        type="button"
        aria-label="Take a photo"
        onClick={() => inputRef.current?.click()}
        className="pointer-events-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-accent text-white shadow-float ring-4 ring-page transition-transform active:scale-90"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="camera-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Clear it so choosing the same photo again still fires onChange.
          e.target.value = ''
          if (file) onPhoto(file)
        }}
      />
      <button
        type="button"
        onClick={onAddWithoutPhoto}
        className="pointer-events-auto rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink/70 shadow-card ring-1 ring-ink/10 transition-colors active:bg-ink/5"
      >
        Add without a photo
      </button>
    </div>
  )
}
