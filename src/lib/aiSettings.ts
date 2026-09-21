// The one AI setting: whether to read every photo automatically. Off by
// default. Kept in localStorage on this device.

const KEY = 'trophy-case.ai-always'

export function getAlwaysReadPhotos(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function setAlwaysReadPhotos(value: boolean): void {
  try {
    localStorage.setItem(KEY, value ? 'true' : 'false')
  } catch {
    // Storage unavailable: the switch just won't stick.
  }
}
