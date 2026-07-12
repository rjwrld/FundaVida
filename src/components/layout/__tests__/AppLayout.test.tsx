import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { AppLayout } from '@/components/layout/AppLayout'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderWithRouter(element: React.ReactNode) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [{ index: true, element: <>{element}</> }],
      },
    ],
    { initialEntries: ['/'] }
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<AppLayout />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    // The block persists the rail state in a cookie, which jsdom keeps across tests in
    // a file — an expanded-by-default assertion would inherit the previous test's collapse.
    document.cookie = 'sidebar_state=; path=/; max-age=0'
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('renders the header, sidebar, and outlet content', () => {
    useStore.getState().setRole('admin')
    renderWithRouter(<div>Hello from outlet</div>)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation' })).toBeInTheDocument()
    expect(screen.getByText('Hello from outlet')).toBeInTheDocument()
  })

  // ⌘/Ctrl+B is the block's shortcut; the state it toggles is what the cookie persists,
  // so the rail comes back collapsed on the next load (lib/sidebarState).
  it('collapses and re-expands the rail on the keyboard shortcut', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    renderWithRouter(<div>Hello from outlet</div>)

    const sidebar = document.querySelector('[data-slot="sidebar"]')
    expect(sidebar).toHaveAttribute('data-state', 'expanded')

    await user.keyboard('{Meta>}b{/Meta}')
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    expect(document.cookie).toContain('sidebar_state=false')

    await user.keyboard('{Control>}b{/Control}')
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
    expect(document.cookie).toContain('sidebar_state=true')
  })

  it('opens the rail collapsed when the persisted cookie says so', () => {
    document.cookie = 'sidebar_state=false; path=/'
    useStore.getState().setRole('admin')
    renderWithRouter(<div>Hello from outlet</div>)

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'collapsed'
    )
  })

  // The header trigger is the mobile drawer's only way in, and the rail's toggle above md.
  it('toggles the sidebar from the header trigger', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    renderWithRouter(<div>Hello from outlet</div>)

    await user.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'collapsed'
    )
  })

  it('renders the app footer within the shell', () => {
    renderWithRouter(<div>Hello from outlet</div>)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText(/developed by josue calderon/i)).toBeInTheDocument()
  })

  it('renders a skip-to-main-content link', () => {
    renderWithRouter(<div id="main-content">Content</div>)
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('moves focus to the main region on client-side navigation, but not on first load', async () => {
    useStore.getState().setRole('admin')
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppLayout />,
          children: [
            { index: true, element: <div>Start page</div> },
            { path: 'next', element: <div>Next page</div> },
          ],
        },
      ],
      { initialEntries: ['/'] }
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
    render(
      <I18nProvider>
        <QueryClientProvider client={client}>
          <MotionConfig reducedMotion="always">
            <RouterProvider router={router} />
          </MotionConfig>
        </QueryClientProvider>
      </I18nProvider>
    )

    // First load must not steal focus — the skip link stays the natural first stop.
    const main = screen.getByRole('main')
    expect(main).not.toHaveFocus()

    await act(async () => {
      await router.navigate('/next')
    })

    // The outlet swaps through AnimatePresence mode="wait", so await the new content.
    await screen.findByText('Next page')
    expect(main).toHaveFocus()
  })

  it('keeps the animated route outlet content mounted under prefers-reduced-motion', () => {
    // The outlet is wrapped in AnimatePresence/motion (fadeUp); reducedMotion="always"
    // mirrors the app's global <MotionConfig reducedMotion="user">. The route content
    // must still mount through the presence boundary — a missed MotionConfig boundary
    // would surface here first (ADR-0027). (Opacity fades are reduced-motion-safe, so
    // the outlet keeps a fade; only transform is suppressed.)
    useStore.getState().setRole('admin')
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppLayout />,
          children: [{ index: true, element: <div>Reduced-motion outlet</div> }],
        },
      ],
      { initialEntries: ['/'] }
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
    render(
      <I18nProvider>
        <QueryClientProvider client={client}>
          <MotionConfig reducedMotion="always">
            <RouterProvider router={router} />
          </MotionConfig>
        </QueryClientProvider>
      </I18nProvider>
    )

    expect(screen.getByText('Reduced-motion outlet')).toBeInTheDocument()
  })
})
