import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CoursesFormPage } from '@/pages/CoursesFormPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(path = '/app/courses/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/courses" element={<div>courses list</div>} />
          <Route path="/app/courses/new" element={<CoursesFormPage />} />
          <Route path="/app/courses/:id" element={<div>course detail</div>} />
          <Route path="/app/courses/:id/edit" element={<CoursesFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('<CoursesFormPage />', () => {
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
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Headquarters is required')).toBeInTheDocument()
    expect(screen.getByText('Program is required')).toBeInTheDocument()
    expect(screen.getByText('Teacher is required')).toBeInTheDocument()
  })

  it('creates a course and lands on its detail page', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('Name'), 'Test Course')
    await user.type(screen.getByLabelText('Description'), 'A test course')
    await user.click(screen.getByRole('combobox', { name: /headquarters/i }))
    await user.click(await screen.findByRole('option', { name: 'San José HQ' }))
    await user.click(screen.getByRole('combobox', { name: /program/i }))
    await user.click(await screen.findByRole('option', { name: 'Literacy' }))
    await user.click(screen.getByRole('combobox', { name: /teacher/i }))
    // Pick the first available teacher option
    const options = await screen.findAllByRole('option')
    if (!options[0]) throw new Error('no teacher options rendered')
    await user.click(options[0])
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(screen.getByText('course detail')).toBeInTheDocument())
    const added = useStore.getState().courses.find((c) => c.name === 'Test Course')
    expect(added).toBeDefined()
  })
})
