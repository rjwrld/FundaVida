import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query currently matches. Subscribes through
 * `useSyncExternalStore`, so the first render already reads the real value — a
 * caller deciding *which* of two CSS-toggled renders is the live one (see
 * `useDataTableSurface`) cannot afford an effect-delayed `false` on mount.
 *
 * The stock `useIsMobile` next door answers a different question (the sidebar's
 * 768px breakpoint) and is left as it ships.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
