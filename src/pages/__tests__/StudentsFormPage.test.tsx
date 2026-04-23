import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
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
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/students" element={<div>students list</div>} />
            <Route path="/app/students/new" element={<StudentsFormPage />} />
            <Route path="/app/students/:id" element={<div>student detail</div>} />
            <Route path="/app/students/:id/edit" element={<StudentsFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<StudentsFormPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('student detail')).toBeInTheDocument()
    const added = useStore.getState().students.find((s) => s.email === 'ada@example.com')
    expect(added).toBeDefined()
  })

  it('prefills the form with existing student data on the edit path and updates on save', async () => {
    const user = userEvent.setup()
    const first = useStore.getState().students[0]
    if (!first) throw new Error('no students in seed')

    renderForm(`/app/students/${first.id}/edit`)

    // Form hydrates async via useStudent + useEffect — wait for the pre-filled name.
    const firstNameInput = (await screen.findByLabelText('First name')) as HTMLInputElement
    // The effect may fire a tick after mount; wait for the value to settle.
    await waitFor(() => expect(firstNameInput.value).toBe(first.firstName))

    // Change the first name, submit, and verify the store reflects the update.
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('student detail')).toBeInTheDocument()
    const updated = useStore.getState().students.find((s) => s.id === first.id)
    expect(updated?.firstName).toBe('Renamed')
  })
})
