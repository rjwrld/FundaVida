import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { BrowseCoursesPage } from '@/pages/BrowseCoursesPage'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <BrowseCoursesPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** The student persona's open Courses and their seats, read through the same seams. */
async function openCourses() {
  const courses = await api.courses.list({ scopeOverride: 'browseable', openOnly: true })
  return Promise.all(
    courses.map(async (course) => ({ course, seats: await api.courses.seatsRemaining(course.id) }))
  )
}

describe('<BrowseCoursesPage /> — the student Courses page (ADR-0043/0051)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('student')
  })

  it('lists each open Course as a link with the seats left', async () => {
    const open = await openCourses()
    expect(open.length).toBeGreaterThan(0)
    renderPage()
    // DataTable renders each row twice (table + mobile card, ADR-0026); read the table.
    const table = await screen.findByRole('table')

    for (const { course, seats } of open) {
      const link = within(table).getByRole('link', { name: course.name })
      expect(link).toHaveAttribute('href', `/app/courses/${course.id}`)
      const row = link.closest('tr')
      expect(row).not.toBeNull()
      if (row) expect(await within(row).findByText(`${seats} seats left`)).toBeInTheDocument()
    }
  })

  // Every open Course already matches the student's own Level (ADR-0016), and its
  // name already leads with the Program, so neither column carries information.
  it('drops the Level and Program columns', async () => {
    renderPage()
    await screen.findByRole('table')
    expect(screen.queryByRole('columnheader', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Program' })).not.toBeInTheDocument()
  })

  it('reads the seats in Spanish too', async () => {
    useStore.getState().setLocale('es')
    const [first] = await openCourses()
    if (!first) throw new Error('seed has no open course for the student persona')
    renderPage()
    const table = await screen.findByRole('table')
    const link = within(table).getByRole('link', { name: first.course.name })
    const row = link.closest('tr')
    if (row)
      expect(await within(row).findByText(`Quedan ${first.seats} espacios`)).toBeInTheDocument()
  })
})
