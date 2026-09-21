import { useEffect, useState } from 'react'

// Turns a Blob into a temporary URL an <img> can show, and cleans it up
// when the blob changes or the component goes away. Without the cleanup the
// browser would keep every photo in memory.
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}
