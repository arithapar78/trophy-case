import { describe, expect, it } from 'vitest'
import { appName } from '../../src/lib/appInfo'

describe('appInfo', () => {
  it('names the app', () => {
    expect(appName).toBe('Trophy Case')
  })
})
