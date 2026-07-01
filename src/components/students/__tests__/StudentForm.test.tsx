import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { StudentForm } from '@/components/students/StudentFormDialog'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(props: Partial<Parameters<typeof StudentForm>[0]> = {}) {
  const onSuccess = vi.fn()
  const onCancel = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <StudentForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
      </QueryClientProvider>
    </I18nProvider>
  )
  return { onSuccess, onCancel }
}

describe('<StudentForm />', () => {
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
    // Both the student and guardian email fields flag on empty submit.
    expect(screen.getAllByText('Enter a valid email').length).toBeGreaterThan(0)
  })

  it('associates each invalid field with its error for assistive tech', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // A representative text input: flagged invalid and described by its error.
    const firstName = await screen.findByLabelText('First name')
    expect(firstName).toHaveAttribute('aria-invalid', 'true')
    expect(firstName).toHaveAccessibleDescription('First name is required')

    // A representative Select (combobox): same wiring through the trigger.
    const province = screen.getByRole('combobox', { name: /province/i })
    expect(province).toHaveAttribute('aria-invalid', 'true')
    expect(province).toHaveAccessibleDescription('Province is required')

    // The error messages are announced.
    expect(screen.getByText('First name is required')).toHaveAttribute('role', 'alert')
  })

  it('creates a student and calls onSuccess', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderForm()
    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lovelace')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('combobox', { name: /province/i }))
    await user.click(await screen.findByRole('option', { name: 'San José' }))
    // Canton options are scoped to the chosen province.
    await user.click(screen.getByRole('combobox', { name: /canton/i }))
    await user.click(await screen.findByRole('option', { name: 'Escazú' }))
    await user.click(screen.getByRole('combobox', { name: /campus/i }))
    await user.click(await screen.findByRole('option', { name: 'Linda Vista' }))
    // Encargado (guardian) — required.
    await user.type(screen.getByLabelText(/guardian name/i), 'María Lovelace')
    await user.click(screen.getByRole('combobox', { name: /relationship/i }))
    await user.click(await screen.findByRole('option', { name: 'Mother' }))
    await user.type(screen.getByLabelText(/guardian phone/i), '8888-8888')
    await user.type(screen.getByLabelText(/guardian email/i), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const created = useStore.getState().students.find((s) => s.email === 'ada@example.com')
    expect(created?.guardian).toMatchObject({
      name: 'María Lovelace',
      relationship: 'madre',
      phone: '8888-8888',
      email: 'maria@example.com',
    })
  })

  it('prefills existing data on edit and updates on save', async () => {
    const user = userEvent.setup()
    const first = useStore.getState().students[0]
    if (!first) throw new Error('no students in seed')
    const { onSuccess } = renderForm({ studentId: first.id })

    const firstNameInput = (await screen.findByLabelText('First name')) as HTMLInputElement
    // Prefill is async (react-hook-form reset() after the student loads); the default
    // 1000ms waitFor timeout is too tight for slow CI runners, so allow more headroom.
    await waitFor(() => expect(firstNameInput.value).toBe(first.firstName), { timeout: 3000 })

    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(useStore.getState().students.find((s) => s.id === first.id)?.firstName).toBe('Renamed')
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
