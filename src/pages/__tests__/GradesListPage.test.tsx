import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { GradesListPage } from '@/pages/GradesListPage'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import { courseDisplayState } from '@/lib/courseDisplayState'
import type { Course, Grade } from '@/types'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/grades']}>
          <Routes>
            <Route path="/app/grades" element={<GradesListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<GradesListPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  // Count only the filter dropdowns, not the pager's "Rows per page" select
  // (also a combobox, but it lives outside the filters region).
  const filterComboboxes = () =>
    within(screen.getByRole('region', { name: 'Filters' })).getAllByRole('combobox')

  it('shows scoped student and course filters for a teacher', async () => {
    useStore.getState().setRole('teacher')
    renderPage()

    // Teacher has students enrolled in own courses, so both filters render
    await waitFor(() => {
      expect(filterComboboxes()).toHaveLength(2)
    })
  })

  it('hides the student filter for a student (no visible students in scope)', async () => {
    useStore.getState().setRole('student')
    renderPage()

    await waitFor(() => {
      expect(filterComboboxes()).toHaveLength(1)
    })
  })

  it('shows both filters for an admin', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await waitFor(() => {
      expect(filterComboboxes()).toHaveLength(2)
    })
  })

  it('shows the illustrated empty state when there are no grades', async () => {
    useStore.getState().setRole('admin')
    useStore.setState({ grades: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: /no grades yet/i })).toBeInTheDocument()
  })

  it('windows the scoped grades to the default page size', async () => {
    useStore.getState().setRole('admin')
    const total = useStore.getState().grades.length
    expect(total).toBeGreaterThan(10) // guard: the seed must exceed one page
    renderPage()

    const table = await screen.findByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(10)
    expect(screen.getByText(`Page 1 of ${Math.ceil(total / 10)}`)).toBeInTheDocument()
  })

  describe('row actions follow the permission matrix per row', () => {
    // Two grades in the acting Teacher's Owned Courses: one in a Term-ended,
    // still-published Course (gradable) and one in a closed Course (terminal).
    function seedTeacherGrades() {
      useStore.getState().setRole('teacher')
      const { courses, currentUserId, enrollments } = useStore.getState()
      const own = courses.filter((c) => c.teacherId === currentUserId)
      const gradable = own.find((c) => courseDisplayState(c, clock.now()) === 'termEnded')
      const closed = own.find((c) => c.status === 'closed')
      if (!gradable || !closed) throw new Error('seed: acting teacher needs both course kinds')
      const gradeIn = (course: Course, id: string): Grade => {
        const enrollment = enrollments.find(
          (e) => e.courseId === course.id && e.status === 'approved'
        )
        if (!enrollment) throw new Error(`seed: no approved enrollment in ${course.id}`)
        return {
          id,
          studentId: enrollment.studentId,
          courseId: course.id,
          score: 85,
          issuedAt: clock.now().toISOString(),
        }
      }
      useStore.setState({ grades: [gradeIn(gradable, 'g-open'), gradeIn(closed, 'g-closed')] })
      return { gradable, closed }
    }

    it('gives a Teacher Edit only on a gradable Course and never Delete', async () => {
      const { gradable, closed } = seedTeacherGrades()
      renderPage()

      const table = await screen.findByRole('table')
      const rowFor = (course: Course) =>
        within(table)
          .getAllByRole('row')
          .find((r) => within(r).queryByText(course.name)) as HTMLElement
      await waitFor(() => expect(rowFor(gradable)).toBeDefined())

      expect(within(rowFor(gradable)).getByRole('button', { name: /^edit/i })).toBeInTheDocument()
      expect(within(rowFor(closed)).queryByRole('button', { name: /^edit/i })).toBeNull()
      expect(within(table).queryByRole('button', { name: /^delete/i })).toBeNull()
    })

    it('hides the Actions column for a Student', async () => {
      useStore.getState().setRole('student')
      renderPage()

      const table = await screen.findByRole('table')
      expect(within(table).queryByRole('columnheader', { name: 'Actions' })).toBeNull()
      expect(within(table).queryByRole('button', { name: /^(edit|delete)/i })).toBeNull()
    })

    it('gives an Admin both Edit and Delete', async () => {
      useStore.getState().setRole('admin')
      renderPage()

      const table = await screen.findByRole('table')
      expect(within(table).getAllByRole('button', { name: /^edit/i }).length).toBeGreaterThan(0)
      expect(within(table).getAllByRole('button', { name: /^delete/i }).length).toBeGreaterThan(0)
    })
  })

  it('only tells an Admin that entries can be corrected or removed', async () => {
    useStore.getState().setRole('teacher')
    const { unmount } = renderPage()
    await screen.findByRole('heading', { name: 'Grades' })
    expect(screen.queryByText(/correct or remove/i)).toBeNull()
    unmount()

    useStore.getState().setRole('admin')
    renderPage()
    expect(await screen.findByText(/correct or remove/i)).toBeInTheDocument()
  })
})
