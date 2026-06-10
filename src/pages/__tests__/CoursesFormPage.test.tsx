import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { CoursesFormPage } from '@/pages/CoursesFormPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { format } from 'date-fns'

function renderForm(path = '/app/courses/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
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
    </I18nProvider>
  )
}

describe('<CoursesFormPage />', () => {
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
    expect(await screen.findByText('Course name is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Headquarters is required')).toBeInTheDocument()
    expect(screen.getByText('Program is required')).toBeInTheDocument()
    expect(screen.getByText('Teacher is required')).toBeInTheDocument()
  })

  it('shows validation errors for term and meeting days on empty submit', async () => {
    const user = userEvent.setup()
    renderForm()
    // Fill in basic fields but skip term/meeting days
    await user.type(screen.getByLabelText('Course name'), 'Test Course')
    await user.type(screen.getByLabelText('Description'), 'A test course')
    await user.click(screen.getByRole('combobox', { name: /headquarters/i }))
    await user.click(await screen.findByRole('option', { name: 'San José HQ' }))
    await user.click(screen.getByRole('combobox', { name: /program/i }))
    await user.click(await screen.findByRole('option', { name: 'Literacy' }))
    await user.click(screen.getByRole('combobox', { name: /teacher/i }))
    const options = await screen.findAllByRole('option')
    if (!options[0]) throw new Error('no teacher options rendered')
    await user.click(options[0])
    await user.click(screen.getByRole('button', { name: 'Save' }))
    // Should see errors for missing term start, term end, and meeting days
    expect(await screen.findByText('Term start is required')).toBeInTheDocument()
    expect(screen.getByText('Term end is required')).toBeInTheDocument()
    expect(screen.getByText('At least one meeting day is required')).toBeInTheDocument()
  })

  it('creates a course and lands on its detail page', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('Course name'), 'Test Course')
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
    // Fill in term dates
    await user.type(screen.getByLabelText('Term start'), '2026-06-15')
    await user.type(screen.getByLabelText('Term end'), '2026-08-15')
    // Check at least one meeting day
    const mondayCheckbox = screen.getByRole('checkbox', { name: 'Monday' })
    await user.click(mondayCheckbox)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('course detail')).toBeInTheDocument())
    const added = useStore.getState().courses.find((c) => c.name === 'Test Course')
    expect(added).toBeDefined()
    if (!added) throw new Error('Course not found')
    // Verify stored course round-trips to the same calendar day (local timezone)
    expect(format(new Date(added.term.start), 'yyyy-MM-dd')).toBe('2026-06-15')
    expect(format(new Date(added.term.end), 'yyyy-MM-dd')).toBe('2026-08-15')
  })
})
