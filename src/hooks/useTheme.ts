import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
// Theme is a UI preference, not seed-snapshot data, so it is intentionally not
// versioned with the snapshot — a seed-schema bump (v1→v2) must never reset it.
const STORAGE_KEY = 'fundavida:v1:theme'

function resolveSystem(): 'light' | 'dark' {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * Exported for the theme-wipe path (ADR-0047 phase 6b): the View Transition
 * callback must flip the root class synchronously — `setTheme`'s effect lands
 * on React's schedule, after the transition has already captured the "new"
 * state. Idempotent, so the effect re-applying it later is harmless.
 */
export function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? resolveSystem() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/** Whether a Theme choice resolves to dark right now (system reads the OS). */
export function resolvesDark(theme: Theme): boolean {
  return (theme === 'system' ? resolveSystem() : theme) === 'dark'
}

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  })

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return { theme, setTheme }
}
