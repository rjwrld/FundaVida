import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { fullName } from '@/lib/personName'
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

  it('associates each invalid field with its error for assistive tech', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const name = await screen.findByLabelText('Course name')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('Course name is required')

    const level = screen.getByRole('combobox', { name: /level/i })
    expect(level).toHaveAttribute('aria-invalid', 'true')
    expect(level).toHaveAccessibleDescription('Level is required')

    expect(screen.getByText('Course name is required')).toHaveAttribute('role', 'alert')
  })

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('populates the assigned Teacher when editing an existing course', async () => {
    const { courses, teachers } = useStore.getState()
    const course = courses.find((c) => teachers.some((t) => t.id === c.teacherId))
    if (!course) throw new Error('seed has no course with a resolvable teacher')
    const teacher = teachers.find((t) => t.id === course.teacherId)
    if (!teacher) throw new Error('expected the assigned teacher to exist')
    const teacherName = fullName(teacher)

    renderForm({ courseId: course.id })

    // The Teacher options are Sede-filtered, so they are empty at first mount and
    // appear only when the async course load resets `sede`. The selected label must
    // still resolve to the assigned teacher rather than sticking on the placeholder.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Teacher' })).toHaveTextContent(teacherName)
    )
  })

  it('offers only Teachers at the chosen Sede (ADR-0011)', async () => {
    const user = userEvent.setup()
    const teachers = useStore.getState().teachers
    const sede = 'Linda Vista'
    const sameSede = teachers.filter((t) => t.sede === sede)
    expect(sameSede.length).toBeGreaterThan(0)
    expect(sameSede.length).toBeLessThan(teachers.length)

    renderForm()
    await user.click(screen.getByRole('combobox', { name: 'Campus' }))
    await user.click(await screen.findByRole('option', { name: sede }))

    await user.click(screen.getByRole('combobox', { name: 'Teacher' }))
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(sameSede.length)
  })

  it('clears the selected Teacher when the Sede changes', async () => {
    const user = userEvent.setup()
    const ldaVista = useStore.getState().teachers.find((t) => t.sede === 'Linda Vista')
    if (!ldaVista) throw new Error('expected a Linda Vista teacher')
    const teacherName = fullName(ldaVista)

    renderForm()
    await user.click(screen.getByRole('combobox', { name: 'Campus' }))
    await user.click(await screen.findByRole('option', { name: 'Linda Vista' }))
    await user.click(screen.getByRole('combobox', { name: 'Teacher' }))
    await user.click(await screen.findByRole('option', { name: teacherName }))
    expect(screen.getByRole('combobox', { name: 'Teacher' })).toHaveTextContent(teacherName)

    // Switching Sede invalidates the teacher (a Teacher belongs to one Sede).
    await user.click(screen.getByRole('combobox', { name: 'Campus' }))
    await user.click(await screen.findByRole('option', { name: 'Hatillo' }))
    expect(screen.getByRole('combobox', { name: 'Teacher' })).not.toHaveTextContent(teacherName)
  })
})
