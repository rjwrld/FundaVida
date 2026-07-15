import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { I18nProvider } from '@/lib/i18n'
import { ProgramsListPage } from '@/pages/ProgramsListPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

// The catalog grid enters through the staggered card-grid pattern (phase 6a),
// opting out via framer's `useReducedMotion()` — the mocked seam, per the
// data-table/tabs precedent; the rest of the module stays real.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/programs']}>
          <ProgramsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<ProgramsListPage />', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('admin')
  })

  it('lists every seeded program as a linked card in the staggered grid', async () => {
    const programs = useStore.getState().programs
    expect(programs.length).toBeGreaterThan(0)
    renderPage()

    const first = programs[0]
    if (!first) throw new Error('seed should carry programs')
    const link = await screen.findByRole('link', { name: first.name })
    expect(link).toHaveAttribute('href', `/app/programs/${first.id}`)
    expect(screen.getAllByRole('listitem')).toHaveLength(programs.length)
  })

  it('renders the same catalog under prefers-reduced-motion', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const programs = useStore.getState().programs
    renderPage()

    const first = programs[0]
    if (!first) throw new Error('seed should carry programs')
    expect(await screen.findByRole('link', { name: first.name })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(programs.length)
  })
})
