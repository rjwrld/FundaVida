import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const router = createMemoryRouter([{ path: '/app/*', element: <Breadcrumbs /> }], {
    initialEntries: [path],
  })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<Breadcrumbs />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('resolves a student id segment to the student name', async () => {
    const student = useStore.getState().students[0]
    if (!student) throw new Error('expected a seeded student')
    renderAt(`/app/students/${student.id}`)

    const fullName = `${student.firstName} ${student.lastName}`
    expect(await screen.findByText(fullName)).toBeInTheDocument()
    expect(screen.queryByText(student.id)).not.toBeInTheDocument()
  })

  it('resolves a course id segment to the course name', async () => {
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected a seeded course')
    renderAt(`/app/courses/${course.id}`)

    expect(await screen.findByText(course.name)).toBeInTheDocument()
    expect(screen.queryByText(course.id)).not.toBeInTheDocument()
  })

  it('falls back to the raw id for an unknown entity', () => {
    renderAt('/app/students/stu-does-not-exist')
    expect(screen.getByText('stu-does-not-exist')).toBeInTheDocument()
  })
})
