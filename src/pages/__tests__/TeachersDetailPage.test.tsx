import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatDate } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { TeachersDetailPage } from '@/pages/TeachersDetailPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderDetail(id: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/app/teachers/${id}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/teachers/:id" element={<TeachersDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

function req<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

/**
 * Reads fixtures from the seeded store (deterministic). The first emitted
 * Certificate anchors a (closed Course, its Teacher) pair: a Certificate exists
 * only after its Course was closed (ADR-0024), so the Course's Teacher is
 * guaranteed an assigned Course with a passing Grade and an issued Certificate.
 * Derived at runtime so the assertions track the seed.
 */
function adminFixtures() {
  const s = useStore.getState()
  const cert = req(s.certificates[0], 'seed: no emitted certificate')
  const course = req(
    s.courses.find((c) => c.id === cert.courseId),
    'seed: certificate course missing'
  )
  const teacher = req(
    s.teachers.find((t) => t.id === course.teacherId),
    'seed: course teacher missing'
  )
  const rosterCount = s.enrollments.filter(
    (e) => e.courseId === course.id && e.status === 'approved'
  ).length
  const gradedCount = s.grades.filter((g) => g.courseId === course.id).length
  const certCount = s.certificates.filter((c) => c.courseId === course.id).length
  return { teacher, course, rosterCount, gradedCount, certCount }
}

describe('<TeachersDetailPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('shows the teacher province and canton', async () => {
    const teacher = useStore.getState().teachers[0]
    if (!teacher) throw new Error('expected a seeded teacher')
    renderDetail(teacher.id)

    expect(await screen.findByText(teacher.province)).toBeInTheDocument()
    expect(screen.getByText(teacher.canton)).toBeInTheDocument()
  })

  it('renders a per-course row linking to each assigned course with its status', async () => {
    const { teacher, course } = adminFixtures()
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    expect(link).toHaveAttribute('href', `/app/courses/${course.id}`)
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // Closed Course (it has an emitted certificate) → the "Closed" status label.
    expect(within(row).getByText('Closed')).toBeInTheDocument()
  })

  it('shows the approved-enrollment roster count per course', async () => {
    const { teacher, course, rosterCount } = adminFixtures()
    expect(rosterCount).toBeGreaterThan(0)
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // The roster cell fills in when useEnrollments resolves, after the row itself renders.
    await waitFor(() =>
      expect(within(row).getByTestId('teacher-course-roster')).toHaveTextContent(
        String(rosterCount)
      )
    )
  })

  it('shows the number of graded enrollments per course', async () => {
    const { teacher, course, gradedCount } = adminFixtures()
    expect(gradedCount).toBeGreaterThan(0)
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // The graded cell fills in when useGrades resolves, after the row itself renders.
    await waitFor(() =>
      expect(within(row).getByTestId('teacher-course-graded')).toHaveTextContent(
        String(gradedCount)
      )
    )
  })

  it('shows the number of certificates issued per course', async () => {
    const { teacher, course, certCount } = adminFixtures()
    expect(certCount).toBeGreaterThan(0)
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // The certs cell fills in when useCertificates resolves, after the row itself renders.
    await waitFor(() =>
      expect(within(row).getByTestId('teacher-course-certs')).toHaveTextContent(String(certCount))
    )
  })

  it('shows the course term (date range) per course', async () => {
    const { teacher, course } = adminFixtures()
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    const term = within(row).getByTestId('teacher-course-term')
    expect(term).toHaveTextContent(formatDate(course.term.start, 'en'))
    expect(term).toHaveTextContent(formatDate(course.term.end, 'en'))
  })

  it('shows an empty state and no table when the teacher has no assigned courses', async () => {
    const teacher = req(
      useStore.getState().teachers.find((t) => t.courseIds.length === 0),
      'seed: expected a teacher with no assigned courses'
    )
    renderDetail(teacher.id)

    expect(await screen.findByText('No assigned courses.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
