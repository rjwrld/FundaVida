import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatDate, formatGrade, formatPercent } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
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
          initialEntries={[`/app/students/${id}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
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
    expect(within(row).getByText(formatGrade(grade.score, 'en'))).toBeInTheDocument()
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
    expect(within(row).getByText(expected)).toBeInTheDocument()
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
    expect(within(row).getByText('Issued')).toBeInTheDocument()
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
        name: `${rosterStudent.firstName} ${rosterStudent.lastName}`,
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
        name: `${outsideStudent.firstName} ${outsideStudent.lastName}`,
      })
    ).not.toBeInTheDocument()
  })
})
