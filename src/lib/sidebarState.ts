/**
 * The Sidebar block persists its expanded/collapsed state by writing a
 * `sidebar_state` cookie (see `ui/sidebar.tsx`). The registry only ever *reads*
 * that cookie in its Next.js recipe, where the server layout passes it back as
 * `defaultOpen`. This app is a static SPA with no server render, so the read
 * lives here and `AppLayout` hands the result to `SidebarProvider` — without it
 * the collapsed rail springs back open on every reload.
 */
const SIDEBAR_COOKIE_NAME = 'sidebar_state'

/** `false` only when the block explicitly wrote a collapsed state; expanded otherwise. */
export function readSidebarState(cookie: string = document.cookie): boolean {
  const match = new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`).exec(cookie)
  return match?.[1] !== 'false'
}
