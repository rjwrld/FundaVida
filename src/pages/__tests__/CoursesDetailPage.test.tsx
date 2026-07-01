import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatGrade, formatDate } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { sessionsFor } from '@/lib/sessions'
import { SEDES } from '@/constants/sede'
import { CoursesDetailPage } from '@/pages/CoursesDetailPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Role } from '@/types'

function renderPage(courseId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[`/app/courses/${courseId}`]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/courses/:id" element={<CoursesDetailPage />} />
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
 * Reads fixtures from the seeded store. The demo seed (faker.seed(42)) is
 * deterministic: stu-1 is enrolled in cou-1 (a completed, graded Course owned
 * by tea-1) alongside graded classmates, and in cou-3 (ungraded). stu-1 is not
 * enrolled in cou-2. These are derived at runtime rather than hard-coded so the
 * assertions track the seed.
 */
function fixtures() {
  const s = useStore.getState()
  const self = 'stu-1'
  const gradedCourse = req(
    s.courses.find((c) => c.id === 'cou-1'),
    'seed: cou-1 missing'
  )
  const ownGrade = req(
    s.grades.find((g) => g.studentId === self && g.courseId === gradedCourse.id),
    'seed: stu-1 has no grade in cou-1'
  )
  const classmateEnrollment = req(
    s.enrollments.find(
      (e) =>
        e.courseId === gradedCourse.id &&
        e.studentId !== self &&
        s.grades.some((g) => g.studentId === e.studentId && g.courseId === gradedCourse.id)
    ),
    'seed: cou-1 has no graded classmate'
  )
  const classmate = req(
    s.students.find((st) => st.id === classmateEnrollment.studentId),
    'seed: classmate student missing'
  )
  const ungradedCourse = req(
    s.courses.find((c) => c.id === 'cou-3'),
    'seed: cou-3 missing'
  )
  const notEnrolled = req(
    s.courses.find((c) => !s.enrollments.some((e) => e.studentId === self && e.courseId === c.id)),
    'seed: stu-1 is enrolled in every course'
  )
  const student = req(
    s.students.find((st) => st.id === self),
    'seed: stu-1 student missing'
  )
  // Find a published course at stu-1's sede/level that stu-1 is not enrolled in
  const browseableCourse = req(
    s.courses.find(
      (c) =>
        c.status === 'published' &&
        c.sede === student.sede &&
        c.level === student.educationalLevel &&
        !s.enrollments.some((e) => e.studentId === self && e.courseId === c.id)
    ),
    'seed: no browseable course found for stu-1'
  )
  // tea-1's just-ended cohort is still published (the teacher hasn't run the close
  // ceremony) — the runway for the Close-course action. cou-1 is now closed (a
  // completed cohort), so the close tests need this separate published fixture.
  const publishedOwnCourse = req(
    s.courses.find((c) => c.teacherId === 'tea-1' && c.status === 'published'),
    'seed: tea-1 has no published course'
  )
  return {
    self,
    gradedCourse,
    ownGrade,
    classmate,
    ungradedCourse,
    notEnrolled,
    browseableCourse,
    publishedOwnCourse,
  }
}

function asRole(role: Role) {
  useStore.getState().setRole(role)
}

describe('<CoursesDetailPage /> — student self-only view (ADR-0012)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows a Student the Course info but never a classmate’s record', async () => {
    const { gradedCourse, classmate } = fixtures()
    asRole('student')
    renderPage(gradedCourse.id)

    // Course info is visible to the enrolled Student…
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    // …but no other student's record (roster row) appears.
    expect(
      screen.queryByText(`${classmate.firstName} ${classmate.lastName}`)
    ).not.toBeInTheDocument()
  })

  it('shows a Student their own Grade for the Course', async () => {
    const { gradedCourse, ownGrade } = fixtures()
    asRole('student')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    // The grade loads from a separate async query, so wait for it rather than
    // asserting synchronously off the heading (raced on slower CI).
    expect(await screen.findByText(formatGrade(ownGrade.score, 'en'))).toBeInTheDocument()
  })

  it('shows a Student their own Attendance for the Course', async () => {
    const { gradedCourse, self } = fixtures()
    const ownAttendance = useStore
      .getState()
      .attendance.filter((a) => a.studentId === self && a.courseId === gradedCourse.id)
    expect(ownAttendance.length).toBeGreaterThan(0)
    asRole('student')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /your attendance/i })).toBeInTheDocument()
    })
    // The rows load from a separate async query, so wait for them rather than
    // asserting synchronously off the heading (raced on slower CI).
    // One row per own Attendance record, plus the table header row.
    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(ownAttendance.length + 1)
    })
  })

  it('denies a Student a Course they are not enrolled in', async () => {
    const { notEnrolled } = fixtures()
    asRole('student')
    renderPage(notEnrolled.id)

    // The scoped read returns null → not-found fallback (back link), never the Course.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: notEnrolled.name })).not.toBeInTheDocument()
  })

  it('shows a Student a browseable Course with a Request button and no roster', async () => {
    const { browseableCourse } = fixtures()
    asRole('student')
    renderPage(browseableCourse.id)

    // Course info is visible to the browsing Student…
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(browseableCourse) })
      ).toBeInTheDocument()
    })
    // …but no roster section appears (ADR-0012: student scope yields empty enrollments).
    expect(screen.queryByRole('heading', { name: /enrolled students/i })).not.toBeInTheDocument()
    // …and the Request button is visible (ADR-0016: browseable third path).
    expect(await screen.findByRole('button', { name: /request a spot/i })).toBeInTheDocument()
  })

  it('shows an admin the full enrollment roster', async () => {
    const { gradedCourse, classmate } = fixtures()
    asRole('admin')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    // The roster loads from a separate async query, so wait for the row rather
    // than asserting synchronously off the heading (raced on slower CI).
    expect(
      await screen.findByText(`${classmate.firstName} ${classmate.lastName}`)
    ).toBeInTheDocument()
  })

  it('shows the Course’s Teacher the full enrollment roster', async () => {
    const { gradedCourse, classmate } = fixtures()
    // cou-1 is owned by tea-1, the seeded teacher persona.
    expect(gradedCourse.teacherId).toBe('tea-1')
    asRole('teacher')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    // The roster loads from a separate async query, so wait for the row rather
    // than asserting synchronously off the heading (raced on slower CI).
    expect(
      await screen.findByText(`${classmate.firstName} ${classmate.lastName}`)
    ).toBeInTheDocument()
  })
})

describe('<CoursesDetailPage /> — in-course certificates module (ADR-0024)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  function emittedCertFixture() {
    const s = useStore.getState()
    const cert = req(s.certificates[0], 'seed: no emitted certificate')
    const course = req(
      s.courses.find((c) => c.id === cert.courseId),
      'seed: certificate course missing'
    )
    const student = req(
      s.students.find((st) => st.id === cert.studentId),
      'seed: certificate student missing'
    )
    return { cert, course, student }
  }

  it('shows an admin the Course’s emitted certificates, list-only (no approve)', async () => {
    const { course, student } = emittedCertFixture()
    asRole('admin')
    renderPage(course.id)

    // The certificates module renders for the roster-viewing admin, listing the
    // emitted Certificate — but offers no approval (closing the Course emits them).
    expect(await screen.findByRole('heading', { name: 'Certificates' })).toBeInTheDocument()
    expect(await screen.findByText(`${student.firstName} ${student.lastName}`)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /approve certificate for/i })
    ).not.toBeInTheDocument()
  })

  it('hides the certificates module from a Student’s self-view', async () => {
    const { gradedCourse } = fixtures()
    asRole('student')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Certificates' })).not.toBeInTheDocument()
  })
})

describe('<CoursesDetailPage /> — close course action (ADR-0024)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows the owning Teacher a Close course button on a published course', async () => {
    const { publishedOwnCourse } = fixtures()
    // tea-1's just-ended cohort is still published and owned by the teacher persona.
    expect(publishedOwnCourse.status).toBe('published')
    expect(publishedOwnCourse.teacherId).toBe('tea-1')
    asRole('teacher')
    renderPage(publishedOwnCourse.id)

    expect(await screen.findByRole('button', { name: 'Close course' })).toBeInTheDocument()
  })

  it('lets an admin close a published course through the confirm dialog', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('admin')
    renderPage(publishedOwnCourse.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Close course' }))

    // Confirm inside the dialog (its confirm button shares the label).
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close course' }))

    await waitFor(() => {
      const updated = useStore.getState().courses.find((c) => c.id === publishedOwnCourse.id)
      expect(updated?.status).toBe('closed')
    })
  })

  it('never shows a Student the Close course button', async () => {
    const { gradedCourse } = fixtures()
    asRole('student')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Close course' })).not.toBeInTheDocument()
  })

  it('hides the Close course button once a course is closed and shows the Closed status', async () => {
    const { publishedOwnCourse } = fixtures()
    // Close it first, then view it as admin.
    asRole('admin')
    useStore.getState().closeCourse(publishedOwnCourse.id)
    renderPage(publishedOwnCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(publishedOwnCourse) })
      ).toBeInTheDocument()
    })
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close course' })).not.toBeInTheDocument()
  })
})

describe('<CoursesDetailPage /> — schedule & roster (issue 153, ADR-0001/0011)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows the Course’s derived Schedule (session ordinal + date) to an admin', async () => {
    const { gradedCourse } = fixtures()
    const sessions = sessionsFor(gradedCourse)
    expect(sessions.length).toBeGreaterThan(0)
    asRole('admin')
    renderPage(gradedCourse.id)

    const heading = await screen.findByRole('heading', { name: 'Schedule' })
    const section = req(
      heading.closest('section') ?? undefined,
      'Schedule heading has no <section>'
    )
    const first = req(sessions[0], 'seed: course has no sessions')
    // Scope to the Schedule section: the attendance marker lists the same sessions.
    expect(
      within(section).getByText(`Session ${first.ordinal} · ${formatDate(first.date, 'en')}`)
    ).toBeInTheDocument()
    // Every derived Session is listed (ordinal + date), nothing Session-shaped stored.
    expect(within(section).getAllByRole('listitem')).toHaveLength(sessions.length)
  })

  // A seeded TCU trainee and the Course they are assigned to (trainee.courseId).
  // Derived from the deterministic seed rather than hard-coded.
  function volunteerFixture() {
    const s = useStore.getState()
    const trainee = req(s.tcuTrainees[0], 'seed: no TCU trainees')
    const course = req(
      s.courses.find((c) => c.id === trainee.courseId),
      'seed: trainee’s assigned course missing'
    )
    return { trainee, course }
  }

  it('shows the Volunteers (assigned TCU trainees) for the Course to an admin', async () => {
    const { trainee, course } = volunteerFixture()
    asRole('admin')
    renderPage(course.id)

    const heading = await screen.findByRole('heading', { name: 'Volunteers' })
    const section = req(
      heading.closest('section') ?? undefined,
      'Volunteers heading has no <section>'
    )
    // findBy: the roster loads via a separate useTcuTrainees() query that isn't in
    // the page's loading gate, so it populates after the heading (raced getByText → #182).
    expect(
      await within(section).findByText(`${trainee.firstName} ${trainee.lastName}`)
    ).toBeInTheDocument()
  })

  it('drops a Sede-mismatched volunteer from the list (One-Sede invariant, ADR-0011)', async () => {
    const { trainee, course } = volunteerFixture()
    const otherSede = req(
      SEDES.find((x) => x !== course.sede),
      'expected more than one Sede'
    )
    // A volunteer carrying this Course's id but a different Sede is an invariant
    // violation; the view must defensively drop it, never render it on the roster.
    const rogue = {
      ...trainee,
      id: 'tcu-rogue',
      firstName: 'Rogue',
      lastName: 'Volunteer',
      sede: otherSede,
    }
    const s = useStore.getState()
    useStore.setState({ tcuTrainees: [...s.tcuTrainees, rogue] })

    asRole('admin')
    renderPage(course.id)

    const heading = await screen.findByRole('heading', { name: 'Volunteers' })
    const section = req(
      heading.closest('section') ?? undefined,
      'Volunteers heading has no <section>'
    )
    // The legitimate same-Sede volunteer is shown…
    // findBy: the roster loads via a separate useTcuTrainees() query that isn't in
    // the page's loading gate, so it populates after the heading (raced getByText → #182).
    expect(
      await within(section).findByText(`${trainee.firstName} ${trainee.lastName}`)
    ).toBeInTheDocument()
    // …but the Sede-mismatched one never appears.
    expect(within(section).queryByText('Rogue Volunteer')).not.toBeInTheDocument()
  })

  it('shows the owning Teacher the Volunteers for their own Course (scope seam)', async () => {
    const s = useStore.getState()
    const ownCourseIds = new Set(s.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id))
    const trainee = req(
      s.tcuTrainees.find((t) => ownCourseIds.has(t.courseId)),
      'seed: no volunteer assigned to a tea-1 course'
    )
    const course = req(
      s.courses.find((c) => c.id === trainee.courseId),
      'seed: trainee’s assigned course missing'
    )
    asRole('teacher')
    renderPage(course.id)

    const heading = await screen.findByRole('heading', { name: 'Volunteers' })
    const section = req(
      heading.closest('section') ?? undefined,
      'Volunteers heading has no <section>'
    )
    // findBy: the roster loads via a separate useTcuTrainees() query that isn't in
    // the page's loading gate, so it populates after the heading (raced getByText → #182).
    expect(
      await within(section).findByText(`${trainee.firstName} ${trainee.lastName}`)
    ).toBeInTheDocument()
  })

  it('renders a closed Course’s status as a Closed badge', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('admin')
    useStore.getState().closeCourse(publishedOwnCourse.id)
    renderPage(publishedOwnCourse.id)

    const badge = await screen.findByTestId('course-status-badge')
    expect(badge).toHaveTextContent('Closed')
  })

  it('shows a published Course’s status badge, not a Closed one', async () => {
    const { publishedOwnCourse } = fixtures()
    expect(publishedOwnCourse.status).toBe('published')
    asRole('admin')
    renderPage(publishedOwnCourse.id)

    const badge = await screen.findByTestId('course-status-badge')
    expect(badge).toHaveTextContent('Published')
    expect(badge).not.toHaveTextContent('Closed')
  })
})
