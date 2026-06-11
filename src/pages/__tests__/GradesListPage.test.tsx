import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('shows scoped student and course filters for a teacher', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Teacher has students enrolled in own courses, so both filters render
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2)
    })
  })

  it('hides the student filter for a student (no visible students in scope)', async () => {
    useStore.getState().setRole('student')
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(1)
    })
  })

  it('shows both filters for an admin', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2)
    })
  })
})
