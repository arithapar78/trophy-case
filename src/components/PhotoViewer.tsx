import { useEffect, useRef, useState } from 'react'
import { useObjectUrl } from '../hooks/useObjectUrl'
import type { Photo } from '../lib/types'

interface Props {
  photos: Photo[]
  startIndex: number
  onClose: () => void
}

function Slide({ photo }: { photo: Photo }) {
  const url = useObjectUrl(photo.blob)
  return (
    <div className="flex h-full w-full shrink-0 snap-center items-center justify-center">
      {url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
    </div>
  )
}

// Full-screen photo view. Swipe sideways to move between an achievement's
// photos; the browser's scroll-snap does the swiping for us.
export default function PhotoViewer({ photos, startIndex, onClose }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const strip = stripRef.current
    if (strip) strip.scrollLeft = strip.clientWidth * startIndex
  }, [startIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 bg-black text-white" role="dialog" aria-label="Photo">
      <div
        ref={stripRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {photos.map((photo) => (
          <Slide key={photo.id} photo={photo} />
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl"
      >
        ×
      </button>
      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
