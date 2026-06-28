import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { CoursesListPage } from '@/pages/CoursesListPage'
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
          initialEntries={['/app/courses']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/courses" element={<CoursesListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<CoursesListPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows add course button for admin role', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add course/i })).toBeInTheDocument()
    })
  })

  it('shows add course button for teacher role (ADR-0016)', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Wait for page to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /courses/i })).toBeInTheDocument()
    })

    // Button should exist for teachers who can now create courses
    const addButton = screen.getByRole('button', { name: /add course/i })
    expect(addButton).toBeInTheDocument()
  })

  it('hides add course button for student role', async () => {
    useStore.getState().setRole('student')
    renderPage()

    // Wait for page to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /courses/i })).toBeInTheDocument()
    })

    // Button should not exist
    const addButton = screen.queryByRole('button', { name: /add course/i })
    expect(addButton).not.toBeInTheDocument()
  })

  it('shows action column header only for admin role', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  it('hides action column header for teacher role', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Wait for page to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /courses/i })).toBeInTheDocument()
    })

    // Actions header should not exist
    const actionsHeader = screen.queryByText('Actions')
    expect(actionsHeader).not.toBeInTheDocument()
  })
})
