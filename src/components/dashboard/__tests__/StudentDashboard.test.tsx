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
import { StudentDashboard } from '../StudentDashboard'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <StudentDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('StudentDashboard — content-first (ADR-0043)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('student')
    useStore.getState().setLocale('en')
  })

  it('leads with the My-courses roll-up and the announcements feed', async () => {
    renderDashboard()
    // The self-view roll-up table (buildStudentProgress) heads the surface…
    expect(screen.getByRole('heading', { name: 'My courses' })).toBeInTheDocument()
    // …and the enrolled-Courses announcements feed resolves in below it.
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
  })

  it('opens the main column with an h2, bridging the PageHeader h1 to the h3 cards', async () => {
    renderDashboard()
    const headings = await screen.findAllByRole('heading')
    expect(headings[0]?.tagName).toBe('H2')
  })

  it('drops the retired navigation shortcut cards', () => {
    renderDashboard()
    // Browse / My profile shortcut cards were deleted (the sidebar and Account nav
    // carry those jobs, ADR-0010/0043).
    expect(screen.queryByText(/browse open courses/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /my profile/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/attendance rate this month/i)).not.toBeInTheDocument()
  })

  it("never shows another role's worklist (no teacher needs-marking)", async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: /announcements/i })
    // The student surface is divergent: it carries no teacher/admin worklist.
    expect(screen.queryByText(/needs marking/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /courses to close/i })).not.toBeInTheDocument()
  })
})
