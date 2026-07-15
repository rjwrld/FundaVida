import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { I18nProvider } from '@/lib/i18n'
import { CourseTitleLink } from '@/components/courses/CourseTitleLink'
import { courseMorphLayoutId } from '@/lib/courseMorph'
import { courseQueryOptions } from '@/hooks/api/courses'
import { enrollmentsQueryOptions } from '@/hooks/api/enrollments'
import { shortCourseName } from '@/lib/courseName'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Course } from '@/types'

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

const mockReducedMotion = vi.mocked(useReducedMotion)

function renderLink(course: Course, shared: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const view = render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CourseTitleLink course={course} shared={shared} />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
  return { ...view, client }
}

describe('<CourseTitleLink />', () => {
  let course: Course

  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('admin')
    mockReducedMotion.mockReturnValue(false)
    const seeded = useStore.getState().courses[0]
    if (!seeded) throw new Error('demo seed has no Courses')
    course = seeded
  })

  it('links to the Course detail page under its short name', () => {
    renderLink(course, false)

    expect(screen.getByRole('link', { name: shortCourseName(course) })).toHaveAttribute(
      'href',
      `/app/courses/${course.id}`
    )
  })

  it('carries the shared element when it owns it', () => {
    const { container } = renderLink(course, true)

    expect(
      container.querySelectorAll(`[data-morph-id="${courseMorphLayoutId(course.id)}"]`)
    ).toHaveLength(1)
  })

  it('carries no shared element when another surface owns it', () => {
    const { container } = renderLink(course, false)

    expect(container.querySelector('[data-morph-id]')).toBeNull()
  })

  it('carries no shared element under prefers-reduced-motion', () => {
    mockReducedMotion.mockReturnValue(true)

    const { container } = renderLink(course, true)

    expect(container.querySelector('[data-morph-id]')).toBeNull()
  })

  it('warms the detail page queries on pointer intent, so the morph can run', async () => {
    const { client } = renderLink(course, true)
    const role = useStore.getState().role

    expect(client.getQueryData(courseQueryOptions(course.id, role).queryKey)).toBeUndefined()

    fireEvent.pointerEnter(screen.getByRole('link', { name: shortCourseName(course) }))

    await waitFor(() => {
      expect(client.getQueryData(courseQueryOptions(course.id, role).queryKey)).toBeDefined()
      expect(
        client.getQueryData(enrollmentsQueryOptions({ courseId: course.id }, role).queryKey)
      ).toBeDefined()
    })
  })

  it('warms the detail page queries on keyboard focus too', async () => {
    const { client } = renderLink(course, true)
    const role = useStore.getState().role

    fireEvent.focus(screen.getByRole('link', { name: shortCourseName(course) }))

    await waitFor(() => {
      expect(client.getQueryData(courseQueryOptions(course.id, role).queryKey)).toBeDefined()
    })
  })
})
