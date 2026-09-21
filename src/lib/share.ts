// Hands a file to the phone's share sheet (iCloud, AirDrop, email...).
// On a laptop, or if sharing files isn't supported, it downloads instead.

export async function shareOrDownload(blob: Blob, fileName: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], fileName, { type: blob.type })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (err) {
      // The user closed the share sheet: nothing to do.
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
      // Anything else: fall back to a download.
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
