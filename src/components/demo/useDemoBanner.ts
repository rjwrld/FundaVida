import { useSyncExternalStore } from 'react'

// A dismissed-banner flag is a UI preference, not seed-snapshot data, so it is
// intentionally not versioned with the snapshot — a reseed must not un-dismiss it.
const DISMISS_KEY = 'fundavida:v1:banner-dismissed'

// The expanded banner (above the header) and the collapsed badge (in the header)
// render in different parts of the tree but must stay in lockstep: dismissing one
// must immediately flip the other. A module-level subscriber set bridges them via
// useSyncExternalStore, so both re-render the instant the flag changes — no
// provider or prop drilling, and the source of truth stays in localStorage.
const listeners = new Set<() => void>()

function emitChange(): void {
  for (const listener of listeners) listener()
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(DISMISS_KEY) === '1'
}

export function useDemoBanner() {
  // No SSR (client-only SPA), so the server snapshot value is irrelevant.
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => true)

  return {
    dismissed,
    dismiss(): void {
      window.localStorage.setItem(DISMISS_KEY, '1')
      emitChange()
    },
    restore(): void {
      window.localStorage.removeItem(DISMISS_KEY)
      emitChange()
    },
  }
}
