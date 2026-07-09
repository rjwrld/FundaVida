import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { TeacherDashboard } from '../TeacherDashboard'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TeacherDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('TeacherDashboard — worklist-first (ADR-0043)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('teacher')
    useStore.getState().setLocale('en')
  })

  it('leads with the needs-marking worklist and courses-to-close', async () => {
    renderDashboard()
    // Marking is the most time-sensitive job, so it heads the surface (ADR-0044).
    expect((await screen.findAllByText(/needs marking/i)).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /courses to close/i })).toBeInTheDocument()
  })

  it('carries the supporting reads: upcoming sessions, own courses, announcements', async () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: /next sessions to mark/i })).toBeInTheDocument()
    // Own courses list (with display-state badges) + the announcements feed.
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'My courses' }).length).toBeGreaterThan(0)
  })

  it('opens the main column with an h2, bridging the PageHeader h1 to the h3 cards', async () => {
    renderDashboard()
    const headings = await screen.findAllByRole('heading')
    expect(headings[0]?.tagName).toBe('H2')
  })

  it('drops the retired "Author a course" prompt card', () => {
    renderDashboard()
    expect(screen.queryByText(/author a course/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create a course/i })).not.toBeInTheDocument()
  })
})
