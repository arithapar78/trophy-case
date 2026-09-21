import { describe, expect, it } from 'vitest'
import { formatBytes } from '../../src/lib/storage'

describe('formatBytes', () => {
  it('picks a sensible unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(20 * 1024)).toBe('20 KB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB')
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB')
  })
})
