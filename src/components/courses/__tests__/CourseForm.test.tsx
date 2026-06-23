import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { CourseForm } from '@/components/courses/CourseFormDialog'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(props: Partial<Parameters<typeof CourseForm>[0]> = {}) {
  const onSuccess = vi.fn()
  const onCancel = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <CourseForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
      </QueryClientProvider>
    </I18nProvider>
  )
  return { onSuccess, onCancel }
}

describe('<CourseForm />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('renders the course fields', () => {
    renderForm()
    expect(screen.getByLabelText('Course name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('does not submit an empty form (validation blocks)', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
