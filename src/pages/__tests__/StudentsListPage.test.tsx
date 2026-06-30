import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { StudentsListPage } from '@/pages/StudentsListPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderList(entry = '/app/students') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[entry]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/students" element={<StudentsListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<StudentsListPage /> modal wiring', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('opens the create modal from the Add button', async () => {
    const user = userEvent.setup()
    renderList()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /add student/i }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('New student')
  })

  it('opens the edit modal prefilled from the ?edit= query param', async () => {
    const first = useStore.getState().students[0]
    if (!first) throw new Error('no students in seed')
    renderList(`/app/students?edit=${first.id}`)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Edit student')
    // The edit modal prefills asynchronously (load student, then react-hook-form reset()),
    // so allow a generous timeout — the default 1000ms is too tight for slow CI runners.
    await waitFor(
      () =>
        expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe(
          first.firstName
        ),
      { timeout: 3000 }
    )
  })
})

describe('<StudentsListPage /> pagination', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('windows the scoped list to the default page size instead of rendering every row', async () => {
    const total = useStore.getState().students.length
    expect(total).toBeGreaterThan(10) // guard: the seed must exceed one page

    renderList()

    // Wait for the table to render, then count body rows (excluding the header).
    const table = await screen.findByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(10)

    // The pager reports the full total across multiple pages.
    expect(screen.getByText(`Page 1 of ${Math.ceil(total / 10)}`)).toBeInTheDocument()
  })
})
