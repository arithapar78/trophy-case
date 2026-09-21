// Talks to the browser about storage: how much the app is using, and asking
// the phone not to clear it. Safari can wipe a website's storage if the site
// goes unused for a while; asking for "persistent" storage (and installing
// to the Home Screen) protects against that.

export async function askForPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface StorageUsage {
  usedBytes: number
  quotaBytes?: number
}

export async function getStorageUsage(): Promise<StorageUsage | undefined> {
  if (!navigator.storage?.estimate) return undefined
  try {
    const { usage, quota } = await navigator.storage.estimate()
    return { usedBytes: usage ?? 0, quotaBytes: quota }
  } catch {
    return undefined
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
