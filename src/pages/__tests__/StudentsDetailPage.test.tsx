import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatDate, formatGrade, formatPercent } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { fullName } from '@/lib/personName'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
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
        <MemoryRouter initialEntries={[`/app/students/${id}`]}>
          <Routes>
            <Route path="/app/students/:id" element={<StudentsDetailPage />} />
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
 * Reads fixtures from the seeded store (faker.seed(42), deterministic). The first
 * emitted Certificate anchors a (Student, closed Course, passing Grade) trio:
 * a Certificate exists iff its Course was closed and the Student passed (ADR-0024),
 * so the subject is guaranteed an approved Enrollment and a >=70 Grade in that
 * Course. Derived at runtime so the assertions track the seed.
 */
function adminFixtures() {
  const s = useStore.getState()
  const cert = req(s.certificates[0], 'seed: no emitted certificate')
  const subject = req(
    s.students.find((st) => st.id === cert.studentId),
    'seed: certificate student missing'
  )
  const course = req(
    s.courses.find((c) => c.id === cert.courseId),
    'seed: certificate course missing'
  )
  const grade = req(
    s.grades.find((g) => g.studentId === subject.id && g.courseId === course.id),
    'seed: subject has no grade in the certificate course'
  )
  return { cert, subject, course, grade }
}

describe('<StudentsDetailPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('shows the encargado (guardian) name, phone, and email', async () => {
    const student = useStore.getState().students[0]
    if (!student) throw new Error('expected a seeded student')
    renderDetail(student.id)

    expect(await screen.findByText(student.guardian.name)).toBeInTheDocument()
    expect(screen.getByText(student.guardian.phone)).toBeInTheDocument()
    expect(screen.getByText(student.guardian.email)).toBeInTheDocument()
  })

  it('lists the student’s enrolled courses from the scoped enrollment seam', async () => {
    const { subject, course } = adminFixtures()
    renderDetail(subject.id)

    expect(await screen.findByRole('link', { name: shortCourseName(course) })).toBeInTheDocument()
  })

  it('shows a passing grade (≥70) with a passing treatment and no approval wait', async () => {
    const { subject, course, grade } = adminFixtures()
    expect(grade.score).toBeGreaterThanOrEqual(70)
    renderDetail(subject.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'enrollment row missing')
    // The grade cell fills in when useGrades resolves, after the row itself renders.
    expect(await within(row).findByText(formatGrade(grade.score, 'en'))).toBeInTheDocument()
    expect(within(row).getByText('Passing')).toBeInTheDocument()
  })

  it('shows the per-course attendance percentage', async () => {
    const { subject, course } = adminFixtures()
    const records = useStore
      .getState()
      .attendance.filter((a) => a.studentId === subject.id && a.courseId === course.id)
    expect(records.length).toBeGreaterThan(0)
    const present = records.filter((r) => r.status === 'present').length
    const expected = formatPercent(present / records.length, 'en')
    renderDetail(subject.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'enrollment row missing')
    // The percentage cell fills in when useAttendance resolves, after the row renders.
    expect(await within(row).findByText(expected)).toBeInTheDocument()
  })

  it('visualizes per-course attendance with a progress bar reflecting the percentage', async () => {
    const { subject, course } = adminFixtures()
    const records = useStore
      .getState()
      .attendance.filter((a) => a.studentId === subject.id && a.courseId === course.id)
    const present = records.filter((r) => r.status === 'present').length
    const expectedValue = Math.round((present / records.length) * 100)
    renderDetail(subject.id)

    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'enrollment row missing')
    // The progress bar renders once useAttendance resolves, after the row itself.
    const bar = await within(row).findByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', String(expectedValue))
  })

  it('marks an enrollment as Issued only when its course has emitted a certificate', async () => {
    const { subject, course } = adminFixtures()
    const certCount = useStore
      .getState()
      .certificates.filter((c) => c.studentId === subject.id).length
    renderDetail(subject.id)

    // The certificate-bearing course's row shows the Issued state…
    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'enrollment row missing')
    // The Issued badge renders once useCertificates resolves, after the row itself.
    expect(await within(row).findByText('Issued')).toBeInTheDocument()
    // …and within the enrollments table, exactly the emitted certificates are
    // marked Issued (open courses show none).
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Issued')).toHaveLength(certCount)
  })

  it('lists the student’s certificates with course and issue date in a downloadable section', async () => {
    const { subject, course, cert } = adminFixtures()
    renderDetail(subject.id)

    // The certificates section renders a card for the emitted certificate, showing
    // the full course name (the enrollments table uses the short name) and the
    // issue date (a Certificate exists only after its Course closed — ADR-0024).
    expect(await screen.findByText(course.name)).toBeInTheDocument()
    expect(screen.getByText(formatDate(cert.issuedAt, 'en'))).toBeInTheDocument()
  })

  it('shows the student’s campus and educational level in the profile summary', async () => {
    const student = req(useStore.getState().students[0], 'seed: no student')
    renderDetail(student.id)

    expect(await screen.findByText(student.sede)).toBeInTheDocument()
    const levelLabel = student.educationalLevel === 'primaria' ? 'Primary' : 'Secondary'
    expect(screen.getByText(levelLabel)).toBeInTheDocument()
  })
})

/** A roster Student of tea-1 (enrolled in one of tea-1's Courses) and a Student
 *  who is not — the scope seam should reveal the former and hide the latter. */
function teacherFixtures() {
  const s = useStore.getState()
  const teacherCourseIds = new Set(
    s.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
  )
  const rosterStudentIds = new Set(
    s.enrollments.filter((e) => teacherCourseIds.has(e.courseId)).map((e) => e.studentId)
  )
  const rosterStudent = req(
    s.students.find((st) => rosterStudentIds.has(st.id)),
    'seed: no student in tea-1 roster'
  )
  const outsideStudent = req(
    s.students.find((st) => !rosterStudentIds.has(st.id)),
    'seed: every student is in tea-1 roster'
  )
  return { rosterStudent, outsideStudent }
}

describe('<StudentsDetailPage /> — scope seam (ADR-0012)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('lets the course teacher view a roster student’s profile', async () => {
    const { rosterStudent } = teacherFixtures()
    useStore.getState().setRole('teacher')
    renderDetail(rosterStudent.id)

    expect(
      await screen.findByRole('heading', {
        name: fullName(rosterStudent),
      })
    ).toBeInTheDocument()
  })

  it('denies a teacher a student outside their roster (scope returns null)', async () => {
    const { outsideStudent } = teacherFixtures()
    useStore.getState().setRole('teacher')
    renderDetail(outsideStudent.id)

    // The scoped read returns null → not-found fallback (back link), never the profile.
    expect(await screen.findByRole('link', { name: /back to home/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: fullName(outsideStudent),
      })
    ).not.toBeInTheDocument()
  })
})

describe('<StudentsDetailPage /> — progress multi-query gate (ADR-0030/0032)', () => {
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

  // First-paint regression: the progress section joins five queries. Gating on
  // the student query alone (with the other four defaulted to []) flashed every
  // enrolled course as "Not graded" (and "—" attendance) in the window before
  // grades/attendance resolved. resolveQueries holds the whole section on a
  // skeleton until all five resolve, so buildStudentProgress never runs on a
  // placeholder and no false verdict paints.
  it('shows a section skeleton — not a false "Not graded" row — until grades resolve', async () => {
    const { subject, course, grade } = adminFixtures()
    expect(grade.score).toBeGreaterThanOrEqual(70)

    // Hold grades open well past the other four queries so the false-verdict
    // window the old gate exposed is wide and deterministic, not a sub-tick race.
    const listGrades = api.grades.list.bind(api.grades)
    vi.spyOn(api.grades, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listGrades(filters)
    })

    renderDetail(subject.id)

    // While grades load, the enrollments section is a loading skeleton: no table,
    // and crucially no transient "Not graded" verdict on the graded course.
    expect(await screen.findByRole('status', { name: 'Loading table' })).toBeInTheDocument()
    expect(screen.queryByText('Not graded')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    // Once grades resolve the real grade paints and the skeleton is gone.
    const link = await screen.findByRole('link', { name: shortCourseName(course) })
    const row = req(link.closest('tr') ?? undefined, 'enrollment row missing')
    expect(await within(row).findByText(formatGrade(grade.score, 'en'))).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading table' })).not.toBeInTheDocument()
  })
})
