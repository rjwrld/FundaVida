import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { TeacherForm } from '@/components/teachers/TeacherFormDialog'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(props: Partial<Parameters<typeof TeacherForm>[0]> = {}) {
  const onSuccess = vi.fn()
  const onCancel = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TeacherForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
      </QueryClientProvider>
    </I18nProvider>
  )
  return { onSuccess, onCancel }
}

describe('<TeacherForm />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('creates a teacher and calls onSuccess', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderForm()
    await user.type(screen.getByLabelText('First name'), 'Grace')
    await user.type(screen.getByLabelText('Last name'), 'Hopper')
    await user.type(screen.getByLabelText('Email'), 'grace@example.com')
    await user.click(screen.getByRole('combobox', { name: /campus/i }))
    await user.click(await screen.findByRole('option', { name: 'Linda Vista' }))
    // Province first, then canton (scoped to the province).
    await user.click(screen.getByRole('combobox', { name: /province/i }))
    await user.click(await screen.findByRole('option', { name: 'Cartago' }))
    await user.click(screen.getByRole('combobox', { name: /canton/i }))
    await user.click(await screen.findByRole('option', { name: 'Turrialba' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const created = useStore.getState().teachers.find((x) => x.email === 'grace@example.com')
    expect(created).toMatchObject({ province: 'Cartago', canton: 'Turrialba' })
  })

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
