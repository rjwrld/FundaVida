import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeachersFormPage } from '@/pages/TeachersFormPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(path = '/app/teachers/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/teachers" element={<div>teachers list</div>} />
          <Route path="/app/teachers/new" element={<TeachersFormPage />} />
          <Route path="/app/teachers/:id" element={<div>teacher detail</div>} />
          <Route path="/app/teachers/:id/edit" element={<TeachersFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('<TeachersFormPage />', () => {
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
    await user.click(screen.getByRole('button', { name: 'Create teacher' }))
    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('creates a teacher and lands on their detail page', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('First name'), 'Grace')
    await user.type(screen.getByLabelText('Last name'), 'Hopper')
    await user.type(screen.getByLabelText('Email'), 'grace@example.com')
    await user.click(screen.getByRole('button', { name: 'Create teacher' }))
    expect(await screen.findByText('teacher detail')).toBeInTheDocument()
    const added = useStore.getState().teachers.find((t) => t.email === 'grace@example.com')
    expect(added).toBeDefined()
  })

  it('prefills the form with existing teacher data on the edit path and updates on save', async () => {
    const user = userEvent.setup()
    const first = useStore.getState().teachers[0]
    if (!first) throw new Error('no teachers in seed')

    renderForm(`/app/teachers/${first.id}/edit`)

    const firstNameInput = (await screen.findByLabelText('First name')) as HTMLInputElement
    await waitFor(() => expect(firstNameInput.value).toBe(first.firstName))

    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('teacher detail')).toBeInTheDocument()
    const updated = useStore.getState().teachers.find((t) => t.id === first.id)
    expect(updated?.firstName).toBe('Renamed')
  })
})
