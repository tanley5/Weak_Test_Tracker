import { afterEach, describe, expect, it, vi } from 'vitest'
import { getChartTheme, subscribeSystemTheme } from '../../src/renderer/src/lib/theme'

describe('theme helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses fallbacks when document is unavailable', () => {
    vi.stubGlobal('window', {})
    // leave document undefined (node) → fallbacks
    const theme = getChartTheme()
    expect(theme.line).toBe('#2f7d62')
    expect(theme.bar).toBe('#a88412')
    expect(theme.grid).toBe('#c5d2cb')
  })

  it('reads CSS custom properties when present', () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn().mockReturnValue({
        getPropertyValue: (name: string) => {
          if (name === '--chart-line') return ' #abc123 '
          return ''
        },
      }),
    )

    expect(getChartTheme().line).toBe('#abc123')
  })

  it('subscribes to prefers-color-scheme changes', () => {
    const listeners = new Set<() => void>()
    const matchMedia = vi.fn().mockReturnValue({
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })
    vi.stubGlobal('window', { matchMedia })

    const onChange = vi.fn()
    const unsubscribe = subscribeSystemTheme(onChange)
    expect(listeners.size).toBe(1)
    listeners.forEach((cb) => cb())
    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe()
    expect(listeners.size).toBe(0)
  })
})
