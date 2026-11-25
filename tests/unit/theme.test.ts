// @vitest-environment jsdom
// Phase 16a tests: light, dark, or match the phone.

import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, getTheme, setTheme, THEME_KEY } from '../../src/lib/theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.head.innerHTML =
    '<meta name="theme-color" content="#f4f5f7" media="(prefers-color-scheme: light)">' +
    '<meta name="theme-color" content="#0a0f1c" media="(prefers-color-scheme: dark)">'
})

const bars = () => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content)

describe('T16a.1 appearance', () => {
  it('defaults to matching the phone', () => {
    expect(getTheme()).toBe('system')
  })

  it('dark sets the attribute, both status bar colours, and is remembered', () => {
    setTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(bars()).toEqual(['#0a0f1c', '#0a0f1c'])
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(getTheme()).toBe('dark')
  })

  it('light forces light even on a dark phone', () => {
    setTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(bars()).toEqual(['#f4f5f7', '#f4f5f7'])
  })

  it('match phone clears the choice and restores both colours', () => {
    setTheme('dark')
    setTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(bars()).toEqual(['#f4f5f7', '#0a0f1c'])
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('ignores anything else stored', () => {
    localStorage.setItem(THEME_KEY, 'purple')
    expect(getTheme()).toBe('system')
    applyTheme(getTheme())
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
