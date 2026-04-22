import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentsFormPage } from '@/pages/StudentsFormPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(path = '/app/students/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/students" element={<div>students list</div>} />
          <Route path="/app/students/new" element={<StudentsFormPage />} />
          <Route path="/app/students/:id" element={<div>student detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('<StudentsFormPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('creates a student and lands on their detail page', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lovelace')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Canton'), 'Central')
    await user.click(screen.getByRole('combobox', { name: /province/i }))
    await user.click(await screen.findByRole('option', { name: 'San José' }))
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('student detail')).toBeInTheDocument()
    const added = useStore.getState().students.find((s) => s.email === 'ada@example.com')
    expect(added).toBeDefined()
  })
})
