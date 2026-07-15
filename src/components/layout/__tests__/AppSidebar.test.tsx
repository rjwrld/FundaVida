import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducedMotion } from 'framer-motion'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useStore } from '@/data/store'
import { axe } from '@/test/axe'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

// The gliding active pill (ADR-0047 phase 6a) opts out through framer's
// `useReducedMotion()`, which latches the media query module-wide — so, per the
// data-table/tabs precedent, the hook is the mocked seam and the rest of the
// module stays real.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

/**
 * The block reads `window.innerWidth` (through `useIsMobile`) to choose between the
 * desktop rail and the sheet, so the viewport is the only switch these tests need.
 * jsdom's default 1024 is the desktop case; `{ mobile: true }` drops it below the md
 * breakpoint, where the nav only exists once the trigger opens the drawer.
 */
function renderSidebar({
  mobile = false,
  route = '/app',
}: { mobile?: boolean; route?: string } = {}) {
  window.innerWidth = mobile ? 500 : 1024
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[route]}>
        <SidebarProvider>
          <SidebarTrigger aria-label="Toggle navigation" />
          <AppSidebar />
          <LocationDisplay />
        </SidebarProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Toggle navigation' }))
  return screen.getByRole('dialog')
}

describe('<AppSidebar />', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    window.innerWidth = 1024
  })

  it('renders nothing when no role is selected', () => {
    renderSidebar()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('groups the role nav under its section labels', () => {
    useStore.getState().setRole('admin')
    renderSidebar()

    const nav = screen.getByRole('navigation', { name: 'Navigation' })
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Students' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Certificates' })).toBeInTheDocument()

    const labels = Array.from(nav.querySelectorAll('[data-slot="sidebar-group-label"]')).map(
      (label) => label.textContent
    )
    expect(labels).toEqual(['Programs', 'People', 'Reports'])
  })

  // The block is presentation; the matrix is truth (ADR-0010). A role without the
  // `students` view permission cannot derive the entry, let alone see it.
  it('derives the visible items from the role (no Students for a student)', () => {
    useStore.getState().setRole('student')
    renderSidebar()

    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My profile' })).toBeInTheDocument()
  })

  it('re-derives the items when the role switches', () => {
    useStore.getState().setRole('admin')
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Audit Logs' })).toBeInTheDocument()

    act(() => useStore.getState().setRole('student'))

    expect(screen.queryByRole('link', { name: 'Audit Logs' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My profile' })).toBeInTheDocument()
  })

  // A detail route keeps its section lit; the Dashboard — which every route sits under —
  // must not stay lit alongside it.
  it('marks the section of the current route active, including its detail routes', () => {
    useStore.getState().setRole('admin')
    renderSidebar({ route: '/app/courses/12' })

    expect(screen.getByRole('link', { name: 'Courses' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('data-active', 'false')
  })

  // Phase 6a: the active highlight is one shared-layoutId pill that glides
  // between items on route change; reduced motion drops the pill and leaves the
  // block's static data-active styling in charge.
  describe('active pill', () => {
    const PILL = '[data-slot="sidebar-active-pill"]'

    it('renders exactly one pill, inside the active item', () => {
      useStore.getState().setRole('admin')
      renderSidebar()

      expect(document.querySelectorAll(PILL)).toHaveLength(1)
      const item = document.querySelector(PILL)?.closest('li')
      expect(item).not.toBeNull()
      expect(within(item as HTMLElement).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'data-active',
        'true'
      )
    })

    it('moves the pill to the newly followed item', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      renderSidebar()

      await user.click(screen.getByRole('link', { name: 'Courses' }))

      expect(document.querySelectorAll(PILL)).toHaveLength(1)
      const item = document.querySelector(PILL)?.closest('li')
      expect(within(item as HTMLElement).getByRole('link', { name: 'Courses' })).toHaveAttribute(
        'data-active',
        'true'
      )
    })

    it('skips the pill under prefers-reduced-motion — static active styling stands in', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true)
      useStore.getState().setRole('admin')
      renderSidebar()

      expect(document.querySelector(PILL)).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('data-active', 'true')
    })
  })

  it('renders the brand lockup and the persona footer', () => {
    useStore.getState().setRole('teacher')
    renderSidebar()

    const nav = screen.getByRole('navigation', { name: 'Navigation' })
    expect(within(nav).getByRole('link', { name: 'FundaVida' })).toBeInTheDocument()

    // The teacher persona (tea-1) resolves to a real person; the footer is its menu.
    const teacher = useStore.getState().teachers.find((t) => t.id === 'tea-1')
    if (!teacher) throw new Error('seed should carry the tea-1 persona')
    expect(
      within(nav).getByRole('button', { name: new RegExp(teacher.firstName, 'i') })
    ).toBeInTheDocument()
  })

  // The Need-help card was deleted in #367 — the repo link lives on the landing
  // page and the app footer; the sidebar footer carries only the role switcher.
  it('renders no Need-help card', () => {
    useStore.getState().setRole('admin')
    renderSidebar()
    expect(screen.queryByText('Need help?')).not.toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    useStore.getState().setRole('admin')
    const { container } = renderSidebar()
    expect(await axe(container)).toHaveNoViolations()
  })

  describe('below the md breakpoint', () => {
    it('keeps the nav closed until the trigger opens the drawer', () => {
      useStore.getState().setRole('admin')
      renderSidebar({ mobile: true })
      expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument()
    })

    it('opens the drawer with the same role-derived nav', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('student')
      renderSidebar({ mobile: true })

      const drawer = await openDrawer(user)
      expect(within(drawer).getByRole('link', { name: 'Courses' })).toBeInTheDocument()
      expect(within(drawer).queryByRole('link', { name: 'Students' })).not.toBeInTheDocument()
    })

    // The landmark has to be inside the block's children, not on `<Sidebar>`: below md the
    // block spreads its props onto Radix's Dialog root, which drops every prop it does not
    // know — so a role/aria-label handed to the block would reach the desktop rail's DOM and
    // silently vanish here, leaving the drawer's nav in no landmark at all.
    it('carries the nav landmark into the drawer', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      renderSidebar({ mobile: true })

      const drawer = await openDrawer(user)
      const nav = within(drawer).getByRole('navigation', { name: 'Navigation' })
      expect(within(nav).getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    })

    it('has no axe violations with the drawer open', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      const { baseElement } = renderSidebar({ mobile: true })

      await openDrawer(user)
      expect(await axe(baseElement)).toHaveNoViolations()
    })

    // #292: the drawer's links must clear the ~44px touch minimum, and the desktop rail
    // must keep its density. The block carries the size through its `lg` variant (h-12);
    // jsdom has no layout, so the variant is what can be pinned here — the real box is
    // measured in e2e/app-shell.spec.ts.
    it('sizes the drawer links for touch, leaving the desktop rail dense', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      renderSidebar({ mobile: true })

      const drawer = await openDrawer(user)
      expect(within(drawer).getByRole('link', { name: 'Courses' })).toHaveAttribute(
        'data-size',
        'lg'
      )
    })

    it('renders the brand row with a close button and closes on it', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      renderSidebar({ mobile: true })

      const drawer = await openDrawer(user)
      const lockup = within(drawer).getByRole('link', { name: 'FundaVida' })
      const close = within(drawer).getByRole('button', { name: 'Close' })
      expect(lockup.parentElement).toBe(close.parentElement)

      await user.click(close)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes the drawer when a nav link is followed', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      renderSidebar({ mobile: true })

      const drawer = await openDrawer(user)
      await user.click(within(drawer).getByRole('link', { name: 'Courses' }))

      expect(screen.getByTestId('location')).toHaveTextContent('/app/courses')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Tapping the lockup while already on /app produces no pathname change for the route
    // effect to react to, so the lockup closes the drawer itself.
    it('closes the drawer when the lockup is tapped on the current route', async () => {
      const user = userEvent.setup()
      useStore.getState().setRole('admin')
      renderSidebar({ mobile: true })

      const drawer = await openDrawer(user)
      await user.click(within(drawer).getByRole('link', { name: 'FundaVida' }))

      expect(screen.getByTestId('location')).toHaveTextContent('/app')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
