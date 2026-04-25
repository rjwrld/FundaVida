import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { DashboardPage } from '@/pages/DashboardPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

function renderDashboard() {
  return render(
    <I18nProvider>
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <DashboardPage />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<DashboardPage /> (admin)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('renders the welcome banner greeting with the admin name', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: /hola, admin/i })).toBeInTheDocument()
  })

  it('renders all four stat-row labels', () => {
    renderDashboard()
    expect(screen.getByText('Total students')).toBeInTheDocument()
    expect(screen.getByText('Active courses')).toBeInTheDocument()
    expect(screen.getByText('Certificates issued')).toBeInTheDocument()
    expect(screen.getByText('TCU hours')).toBeInTheDocument()
  })

  it('renders at least one recent-activity row', () => {
    renderDashboard()
    const heading = screen.getByRole('heading', { name: /recent activity/i })
    expect(heading).toBeInTheDocument()
    const list = heading.parentElement?.parentElement?.querySelector('ul')
    expect(list).not.toBeNull()
    expect(list?.querySelectorAll('li').length ?? 0).toBeGreaterThan(0)
  })

  it('renders the right-panel calendar and upcoming list', () => {
    renderDashboard()
    // CalendarWidget heading shows the current month/year
    const aside = screen.getByRole('complementary')
    expect(aside).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /on your radar/i })).toBeInTheDocument()
  })
})
