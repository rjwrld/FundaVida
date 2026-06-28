import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderDetail(id: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/app/students/${id}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/students/:id" element={<StudentsDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<StudentsDetailPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('shows the encargado (guardian) name, phone, and email', async () => {
    const student = useStore.getState().students[0]
    if (!student) throw new Error('expected a seeded student')
    renderDetail(student.id)

    expect(await screen.findByText(student.guardian.name)).toBeInTheDocument()
    expect(screen.getByText(student.guardian.phone)).toBeInTheDocument()
    expect(screen.getByText(student.guardian.email)).toBeInTheDocument()
  })
})
