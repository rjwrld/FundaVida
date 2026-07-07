import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { MobileNav } from '@/components/layout/MobileNav'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderMobileNav() {
  return render(
    <I18nProvider>
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <MobileNav />
        <LocationDisplay />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<MobileNav />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders no hamburger when no role is selected', () => {
    renderMobileNav()
    expect(screen.queryByRole('button', { name: /open navigation/i })).not.toBeInTheDocument()
  })

  it('keeps the drawer nav closed until the hamburger is pressed', () => {
    useStore.getState().setRole('admin')
    renderMobileNav()
    expect(screen.getByRole('button', { name: /open navigation/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument()
  })

  it('opens the drawer and shows the role nav items', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    renderMobileNav()

    await user.click(screen.getByRole('button', { name: /open navigation/i }))

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
  })

  it('scopes the drawer nav to the role (no Students for a student)', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('student')
    renderMobileNav()

    await user.click(screen.getByRole('button', { name: /open navigation/i }))

    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument()
  })

  it('navigates and closes the drawer when a nav item is clicked', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    renderMobileNav()

    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    await user.click(screen.getByRole('link', { name: 'Courses' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/app/courses')
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument()
  })

  // The sheet's own bg-background used to be overridden by a translucent
  // bg-muted/20 (tailwind-merge keeps the caller's class), rendering the
  // drawer see-through over the page content.
  it('renders the drawer with a solid background', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    renderMobileNav()

    await user.click(screen.getByRole('button', { name: /open navigation/i }))

    const drawer = screen.getByRole('dialog')
    expect(drawer.className).toContain('bg-background')
    expect(drawer.className).not.toMatch(/bg-[a-z-]+\/\d+/)
  })

  // The hamburger hides at md but an open drawer used to survive a resize past
  // the breakpoint, floating over the desktop layout with its trigger gone.
  it('closes the drawer when the viewport crosses the md breakpoint', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')

    // Capture the md listener MobileNav registers; other consumers of
    // matchMedia (e.g. reduced-motion checks) keep the default stub shape.
    let fireMdChange: ((e: MediaQueryListEvent) => void) | undefined
    const stub = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      const mql = stub(query)
      if (!query.includes('min-width: 768px')) return mql
      return {
        ...mql,
        addEventListener: (_type: string, cb: EventListenerOrEventListenerObject) => {
          fireMdChange = cb as unknown as (e: MediaQueryListEvent) => void
        },
      } as MediaQueryList
    })

    renderMobileNav()
    await user.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()

    act(() => fireMdChange?.({ matches: true } as MediaQueryListEvent))

    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })
})
