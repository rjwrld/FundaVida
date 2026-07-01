import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch, clock } from '@/lib/clock'
import { useStore } from '@/data/store'
import { CoursesToClose } from '../CoursesToClose'

// Clock pinned to the seed epoch (src/test/setup.ts) so Term boundaries in the
// seeded store line up with `clock.now()`.
const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <CoursesToClose />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('CoursesToClose', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
  })

  it('lists published, Term-ended courses as links to their close flow, and omits closed ones', async () => {
    const courses = useStore.getState().courses
    const now = clock.now()
    const eligible = courses.find((c) => c.status === 'published' && parseISO(c.term.end) < now)
    const closed = courses.find((c) => c.status === 'closed')
    if (!eligible || !closed) throw new Error('seed should contain a closeable and a closed course')

    renderCard()

    const nameEl = await screen.findByText(eligible.name)
    expect(nameEl.closest('a')).toHaveAttribute('href', `/app/courses/${eligible.id}`)
    // A course that is already closed is not on the worklist.
    expect(screen.queryByText(closed.name)).not.toBeInTheDocument()
  })

  it('shows an all-clear empty state when nothing is ready to close', async () => {
    const original = useStore.getState().courses
    // Only closed / still-running / draft cohorts — none are closeable.
    useStore.setState({
      courses: original.map((c) => ({ ...c, status: 'closed' as const })),
    })
    try {
      renderCard()
      expect(await screen.findByText('No courses are ready to close.')).toBeInTheDocument()
    } finally {
      useStore.setState({ courses: original })
    }
  })
})
