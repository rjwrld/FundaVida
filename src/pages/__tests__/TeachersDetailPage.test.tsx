import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatDate } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { TeachersDetailPage } from '@/pages/TeachersDetailPage'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
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
        <MemoryRouter initialEntries={[`/app/teachers/${id}`]}>
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
    // Closed Course (it has an emitted certificate) → the "Finished" display state (ADR-0042).
    expect(within(row).getByText('Finished')).toBeInTheDocument()
  })

  it('shows the approved-enrollment roster count per course', async () => {
    const { teacher, course, rosterCount } = adminFixtures()
    expect(rosterCount).toBeGreaterThan(0)
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // The row and its cells render together — resolveQueries holds the page until
    // every query resolves (ADR-0030), so the roster count is present synchronously.
    expect(within(row).getByTestId('teacher-course-roster')).toHaveTextContent(String(rosterCount))
  })

  it('shows the number of graded enrollments per course', async () => {
    const { teacher, course, gradedCount } = adminFixtures()
    expect(gradedCount).toBeGreaterThan(0)
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // The row and its cells render together — resolveQueries holds the page until
    // every query resolves (ADR-0030), so the graded count is present synchronously.
    expect(within(row).getByTestId('teacher-course-graded')).toHaveTextContent(String(gradedCount))
  })

  it('shows the number of certificates issued per course', async () => {
    const { teacher, course, certCount } = adminFixtures()
    expect(certCount).toBeGreaterThan(0)
    renderDetail(teacher.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'course row missing')
    // The row and its cells render together — resolveQueries holds the page until
    // every query resolves (ADR-0030), so the certs count is present synchronously.
    expect(within(row).getByTestId('teacher-course-certs')).toHaveTextContent(String(certCount))
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

describe('<TeachersDetailPage /> — first-paint multi-query gate (ADR-0030)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // First-paint regression: the course table joins five queries. Gating on the
  // teacher query alone (the other four defaulted to []) painted `0` in the
  // roster/graded/certs cells in the window before those queries resolved.
  // resolveQueries holds the whole page on the loading placeholder until every
  // query lands, so the table never paints before certificates resolve — the
  // first time a certs cell exists it already shows the real count, never a 0.
  it('never flashes a `0` certs cell — holds the page until certificates resolve', async () => {
    const { teacher, course, certCount } = adminFixtures()
    expect(certCount).toBeGreaterThan(0)

    // Hold certificates open well past the other four queries so the window the
    // old teacher-only gate exposed (table painted, certs cell still 0) is wide
    // and deterministic, not a sub-tick race.
    const listCerts = api.certificates.list.bind(api.certificates)
    vi.spyOn(api.certificates, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listCerts(filters)
    })

    // Capture the anchor row's certs cell the very first frame it paints — a
    // waiting findBy* could poll only after a `0` flash had already resolved and
    // miss it (ADR-0030). The MutationObserver records the first mount, once.
    let firstCerts: string | null = null
    const observer = new MutationObserver(() => {
      if (firstCerts !== null) return
      const link = document.querySelector(`a[href="/app/courses/${course.id}"]`)
      const cell = link?.closest('tr')?.querySelector('[data-testid="teacher-course-certs"]')
      if (cell) firstCerts = cell.textContent
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    try {
      renderDetail(teacher.id)

      const link = await screen.findByRole(
        'link',
        { name: shortCourseName(course) },
        { timeout: 3000 }
      )
      const row = req(link.closest('tr') ?? undefined, 'course row missing')
      expect(within(row).getByTestId('teacher-course-certs')).toHaveTextContent(String(certCount))
      // The FIRST frame the certs cell ever painted already carried the real
      // count — the row never existed with a `0` placeholder.
      expect(firstCerts).toBe(String(certCount))
    } finally {
      observer.disconnect()
    }
  })
})
