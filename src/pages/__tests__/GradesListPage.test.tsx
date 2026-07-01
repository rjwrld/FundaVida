import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { GradesListPage } from '@/pages/GradesListPage'
import { useStore } from '@/data/store'
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
        <MemoryRouter
          initialEntries={['/app/grades']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/grades" element={<GradesListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<GradesListPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  // Count only the filter dropdowns, not the pager's "Rows per page" select
  // (also a combobox, but it lives outside the filters region).
  const filterComboboxes = () =>
    within(screen.getByRole('region', { name: 'Filters' })).getAllByRole('combobox')

  it('shows scoped student and course filters for a teacher', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Teacher has students enrolled in own courses, so both filters render
    await waitFor(() => {
      expect(filterComboboxes()).toHaveLength(2)
    })
  })

  it('hides the student filter for a student (no visible students in scope)', async () => {
    useStore.getState().setRole('student')
    renderPage()

    await waitFor(() => {
      expect(filterComboboxes()).toHaveLength(1)
    })
  })

  it('shows both filters for an admin', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(filterComboboxes()).toHaveLength(2)
    })
  })

  it('shows the illustrated empty state when there are no grades', async () => {
    useStore.getState().setRole('admin')
    useStore.setState({ grades: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: /no grades yet/i })).toBeInTheDocument()
  })

  it('windows the scoped grades to the default page size', async () => {
    useStore.getState().setRole('admin')
    const total = useStore.getState().grades.length
    expect(total).toBeGreaterThan(10) // guard: the seed must exceed one page
    renderPage()

    const table = await screen.findByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(10)
    expect(screen.getByText(`Page 1 of ${Math.ceil(total / 10)}`)).toBeInTheDocument()
  })
})
