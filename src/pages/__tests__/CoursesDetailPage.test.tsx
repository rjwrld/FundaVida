import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { parseISO } from 'date-fns'
import { I18nProvider } from '@/lib/i18n'
import { formatGrade } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { fullName } from '@/lib/personName'
import { sessionsFor } from '@/lib/sessions'
import { closeReadiness, isTermEnded } from '@/lib/closeReadiness'
import { courseDisplayState, isOpenForEnrollment } from '@/lib/courseDisplayState'
import { clock } from '@/lib/clock'
import { SEDES } from '@/constants/sede'
import { CoursesDetailPage } from '@/pages/CoursesDetailPage'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Course, Role } from '@/types'

// The close celebration (ADR-0047 phase 6b) opts out through the page's own
// `useReducedMotion()` read — mock the hook, not `MotionConfig`, which only
// steers framer's animation engine, never this verdict. Default false so every
// existing test keeps its real-motion behavior.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

// Closing a course emits certificates on this same page, whose section then
// fires confetti — jsdom has no canvas, so stub the module out entirely.
vi.mock('@/lib/confetti', () => ({ fireConfetti: vi.fn() }))

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
  // A published course open for enrollment (ADR-0042) at stu-1's sede/level that
  // stu-1 is not enrolled in — the request surface only renders for the open window.
  const browseableCourse = req(
    s.courses.find(
      (c) =>
        c.status === 'published' &&
        isOpenForEnrollment(c, clock.now()) &&
        c.sede === student.sede &&
        c.level === student.educationalLevel &&
        !s.enrollments.some((e) => e.studentId === self && e.courseId === c.id)
    ),
    'seed: no open browseable course found for stu-1'
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
    expect(screen.queryByText(fullName(classmate))).not.toBeInTheDocument()
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

  it('hides the Request button once the Course Term has ended (ADR-0042)', async () => {
    const { browseableCourse } = fixtures()
    // Seal the Term in the past: the course stays viewable (still in the browse
    // scope) but the request surface must drop — the store would reject the
    // mutation, so a live button would contradict the "Term ended" badge.
    const now = clock.now()
    useStore.setState((s) => ({
      courses: s.courses.map((c) =>
        c.id === browseableCourse.id
          ? {
              ...c,
              term: {
                start: new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString(),
                end: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
              },
            }
          : c
      ),
    }))
    asRole('student')
    renderPage(browseableCourse.id)

    // The course detail still renders (the badge shows Term ended)…
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(browseableCourse) })
      ).toBeInTheDocument()
    })
    // …but the request surface is gone.
    expect(screen.queryByRole('button', { name: /request a spot/i })).not.toBeInTheDocument()
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
    expect(await screen.findByText(fullName(classmate))).toBeInTheDocument()
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
    expect(await screen.findByText(fullName(classmate))).toBeInTheDocument()
  })
})

describe('<CoursesDetailPage /> — Message the class entry (ADR-0041)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows the owning Teacher a Message the class button', async () => {
    const { publishedOwnCourse } = fixtures()
    expect(publishedOwnCourse.teacherId).toBe('tea-1')
    asRole('teacher')
    renderPage(publishedOwnCourse.id)

    expect(await screen.findByRole('button', { name: 'Message the class' })).toBeInTheDocument()
  })

  it('shows an admin the button on any live Course (unconditional create)', async () => {
    const s = useStore.getState()
    const otherCourse = req(
      s.courses.find((c) => c.teacherId !== 'tea-1' && c.status === 'published'),
      'seed: no live course owned by another teacher'
    )
    asRole('admin')
    renderPage(otherCourse.id)

    expect(await screen.findByRole('button', { name: 'Message the class' })).toBeInTheDocument()
  })

  it('denies a Teacher a Course they do not own — no button, no detail', async () => {
    const s = useStore.getState()
    const otherCourse = req(
      s.courses.find((c) => c.teacherId !== 'tea-1'),
      'seed: no course owned by another teacher'
    )
    asRole('teacher')
    renderPage(otherCourse.id)

    // A Teacher has no view scope on a Course they don't own: the page falls back
    // to the deny view, so the button can't appear because the detail never does.
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: shortCourseName(otherCourse) })
      ).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Message the class' })).not.toBeInTheDocument()
  })

  it('never shows a Student the button', async () => {
    const { gradedCourse } = fixtures()
    asRole('student')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(gradedCourse) })
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Message the class' })).not.toBeInTheDocument()
  })

  it('hides the button once the Course is closed (terminal cohort, ADR-0024)', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('admin')
    useStore.getState().closeCourse(publishedOwnCourse.id)
    asRole('teacher')
    renderPage(publishedOwnCourse.id)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: shortCourseName(publishedOwnCourse) })
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Message the class' })).not.toBeInTheDocument()
  })

  it('opens a compose dialog locked to the Course and sends an audience-scoped campaign', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('teacher')
    const before = useStore.getState().emailCampaigns.length
    renderPage(publishedOwnCourse.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Message the class' }))

    const dialog = await screen.findByRole('dialog')
    // Locked to the Course: no recipient-filter selector, but an audience picker.
    expect(within(dialog).queryByText('Recipient filter')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Audience')).toBeInTheDocument()
    // The demo disclaimer is present (nothing leaves the browser).
    expect(within(dialog).getByText(/no email leaves the browser/i)).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Subject'), {
      target: { value: 'This week' },
    })
    fireEvent.change(within(dialog).getByLabelText('Body'), {
      target: { value: 'A note for the whole class about materials.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(useStore.getState().emailCampaigns.length).toBe(before + 1)
    })
    const sent = useStore.getState().emailCampaigns[0]
    expect(sent?.filter).toEqual({ kind: 'course', value: publishedOwnCourse.id })
    expect(sent?.sentBy).toBe('tea-1')
  })
})

/**
 * The Course's outbox (ADR-0046). The seed's one teacher-authored class message,
 * cam-4, was sent by tea-1 to cou-1 — a *closed* cohort, which is why the card
 * carries no lifecycle guard while the compose action does.
 */
describe('<CoursesDetailPage /> — Sent messages card (ADR-0046)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** The seeded teacher-authored campaign, and the Course it targeted. */
  function teacherCampaign() {
    const campaign = req(
      useStore.getState().emailCampaigns.find((c) => c.id === 'cam-4'),
      'seed: cam-4 missing'
    )
    if (campaign.filter.kind !== 'course') throw new Error('seed: cam-4 is not course-scoped')
    const course = req(
      useStore.getState().courses.find((c) => c.id === campaign.filter.value),
      'seed: cam-4 targets a course that does not exist'
    )
    return { campaign, course }
  }

  /** A second campaign on the same Course, sent by someone else. */
  function seedAdminCampaignOnSameCourse(subject: string) {
    const { campaign } = teacherCampaign()
    useStore.setState({
      emailCampaigns: [
        ...useStore.getState().emailCampaigns,
        { ...campaign, id: 'cam-admin', subject, sentBy: 'admin' },
      ],
    })
  }

  it("shows the owning Teacher their own class message, and only theirs ('own' scope)", async () => {
    const { campaign, course } = teacherCampaign()
    seedAdminCampaignOnSameCourse("Admin's note to the same class")
    asRole('teacher')
    renderPage(course.id)

    expect(await screen.findByRole('heading', { name: 'Sent messages' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: campaign.subject })).toBeInTheDocument()
    // The scope seam narrowed to sentBy === tea-1: the admin's campaign on the same
    // Course never reaches the teacher's card.
    expect(
      screen.queryByRole('button', { name: "Admin's note to the same class" })
    ).not.toBeInTheDocument()
  })

  it("shows an admin the teacher's class message on the same Course ('all' scope)", async () => {
    const { campaign, course } = teacherCampaign()
    asRole('admin')
    renderPage(course.id)

    expect(await screen.findByRole('button', { name: campaign.subject })).toBeInTheDocument()
  })

  it('renders on a closed cohort, where the compose action does not', async () => {
    const { course } = teacherCampaign()
    expect(course.status).toBe('closed')
    asRole('teacher')
    renderPage(course.id)

    expect(await screen.findByRole('heading', { name: 'Sent messages' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Message the class' })).not.toBeInTheDocument()
  })

  it('never shows a Student the card', async () => {
    const { campaign, course } = teacherCampaign()
    asRole('student')
    renderPage(course.id)

    // stu-1 is enrolled in cou-1, so the detail page renders — but `bulkEmail: {}`
    // denies the card outright.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: shortCourseName(course) })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Sent messages' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: campaign.subject })).not.toBeInTheDocument()
  })

  // "the card shows on every Course the viewer may see, empty-state included"
  // (ADR-0046) — for BOTH audiences the view permission admits, not just the teacher.
  it.each(['teacher', 'admin'] as const)(
    'shows %s an empty state on a Course nobody has messaged',
    async (role) => {
      const { publishedOwnCourse } = fixtures()
      asRole(role)
      renderPage(publishedOwnCourse.id)

      expect(await screen.findByRole('heading', { name: 'Sent messages' })).toBeInTheDocument()
      expect(await screen.findByText('No messages sent to this class yet.')).toBeInTheDocument()
    }
  )

  it('lands a freshly sent class message in the card, with no reload', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('teacher')
    renderPage(publishedOwnCourse.id)

    // Nothing targets this live cohort yet — cam-4 was sent to the closed one.
    expect(await screen.findByText('No messages sent to this class yet.')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'Message the class' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Subject'), {
      target: { value: 'Materiales de esta semana' },
    })
    fireEvent.change(within(dialog).getByLabelText('Body'), {
      target: { value: 'Traigan su cuaderno de apuntes.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))

    // The card shares EMAIL_CAMPAIGNS_KEY with the admin history, so the write-set
    // invalidation sendEmailCampaign already emits refreshes it for free — no new
    // `invalidates` entry, and no reload (ADR-0029, ADR-0046). That "free" refresh
    // is only free while the keys stay prefix-compatible: make the invalidation
    // `exact`, and this row never arrives.
    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: 'Materiales de esta semana' })
        ).toBeInTheDocument()
      },
      { timeout: 4000 }
    )
    expect(screen.queryByText('No messages sent to this class yet.')).not.toBeInTheDocument()
  })

  it('sits beside the compose action, above the overview and the feed', async () => {
    const { course } = teacherCampaign()
    asRole('teacher')
    renderPage(course.id)

    // ADR-0046: compose and outbox are one channel, so the card mounts under the
    // page header that carries "Message the class" — not down in the section flow.
    const outbox = await screen.findByRole('heading', { name: 'Sent messages' })
    const overview = screen.getByRole('heading', { name: 'Overview' })
    const feed = screen.getByRole('heading', { name: 'Announcements' })

    for (const later of [overview, feed]) {
      expect(outbox.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('never paints a zero recipient count while the students query is still open', async () => {
    const { campaign, course } = teacherCampaign()
    asRole('teacher')
    // The count is derived from TWO queries — campaigns and students. Hold students
    // open well past campaigns so the window where rows exist but `students` is
    // still [] is wide and deterministic rather than a sub-tick race (ADR-0030).
    const listStudents = api.students.list
    vi.spyOn(api.students, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listStudents(filters)
    })
    renderPage(course.id)

    // The moment a row exists, its count must already be the real one: a row that
    // paints "0 recipients" and then corrects itself is the flash ADR-0030 forbids.
    await screen.findByRole('button', { name: campaign.subject }, { timeout: 3000 })
    expect(screen.getByTestId('sent-message-recipients')).toHaveTextContent(
      String(campaign.recipientIds.length * 2)
    )
  })

  it('counts only recipients the viewer can still resolve, so a teacher may undercount', async () => {
    const { campaign, course } = teacherCampaign()
    // Every recipient contributes their own address and their Encargado's ('both').
    const fullCount = campaign.recipientIds.length * 2

    // An admin hard-deletes one recipient's enrollments across every Course this
    // teacher owns. Unlike a withdrawal — which keeps the record, and so keeps the
    // Student in `enrolledInOwnCourses` — a delete removes it, dropping that Student
    // out of the teacher's student scope entirely.
    asRole('admin')
    const victim = req(campaign.recipientIds[0], 'seed: cam-4 has no recipients')
    const ownCourseIds = new Set(
      useStore
        .getState()
        .courses.filter((c) => c.teacherId === 'tea-1')
        .map((c) => c.id)
    )
    for (const enrollment of useStore
      .getState()
      .enrollments.filter((e) => e.studentId === victim && ownCourseIds.has(e.courseId))) {
      useStore.getState().unenrollStudent(enrollment.id)
    }

    // The count is reconstructed from who the reader can see, not recorded at send
    // time (ADR-0046). The teacher loses the departed recipient from their count...
    asRole('teacher')
    const teacherView = renderPage(course.id)
    expect(await screen.findByTestId('sent-message-recipients')).toHaveTextContent(
      String(fullCount - 2)
    )
    teacherView.unmount()

    // ...while the admin, whose scope is `all`, still counts them.
    asRole('admin')
    renderPage(course.id)
    expect(await screen.findByTestId('sent-message-recipients')).toHaveTextContent(
      String(fullCount)
    )
  })

  it('opens the sent artifact from a row, with no filter column in the card (ADR-0045)', async () => {
    const { campaign, course } = teacherCampaign()
    asRole('teacher')
    renderPage(course.id)

    fireEvent.click(await screen.findByRole('button', { name: campaign.subject }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Email preview' })).toBeInTheDocument()
    // The recipient count is over emails, not Students (ADR-0041): cam-4's audience
    // is 'both', so each Student contributes their own address and their guardian's.
    expect(within(dialog).getByText(String(campaign.recipientIds.length * 2))).toBeInTheDocument()
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
    expect(await screen.findByText(fullName(student))).toBeInTheDocument()
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
    const dialog = await screen.findByRole('alertdialog')
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

  it('hides the Close course button once a course is closed and shows the Finished state', async () => {
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
    // A closed cohort derives the Finished display state (ADR-0042).
    expect(screen.getByText('Finished')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close course' })).not.toBeInTheDocument()
  })
})

describe('<CoursesDetailPage /> — close celebration (ADR-0047 phase 6b)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  async function confirmClose() {
    fireEvent.click(await screen.findByRole('button', { name: 'Close course' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close course' }))
  }

  it('morphs the button to a checkmark and cascades the checklist, then tears both down', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('admin')
    renderPage(publishedOwnCourse.id)

    // The checklist is on screen pre-close (published + Term ended + closable).
    expect(await screen.findByTestId('close-readiness-verdict')).toBeInTheDocument()
    await confirmClose()

    // The celebration window: the button morphs — its accessible name flips to
    // "Course closed" the instant the close lands, so "Close course" is gone.
    const morphed = await screen.findByRole('button', { name: 'Course closed' })
    expect(morphed).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Close course' })).not.toBeInTheDocument()

    // The checklist stays mounted from its close-time snapshot and cascades:
    // one sweep per checklist row (certificate cards may add their own).
    expect(screen.getByTestId('close-readiness-verdict')).toBeInTheDocument()
    expect(screen.getAllByTestId('celebration-sweep').length).toBeGreaterThanOrEqual(2)

    // …and the window closes on its own: button and checklist both exit.
    await waitFor(
      () => {
        expect(screen.queryByRole('button', { name: 'Course closed' })).not.toBeInTheDocument()
        expect(screen.queryByTestId('close-readiness-verdict')).not.toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('skips the celebration window entirely under prefers-reduced-motion', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { publishedOwnCourse } = fixtures()
    asRole('admin')
    renderPage(publishedOwnCourse.id)

    await confirmClose()

    // The close applies instantly: no morphed state, the action just leaves.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close course' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Course closed' })).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('celebration-sweep')).toHaveLength(0)
  })
})

describe('<CoursesDetailPage /> — close-readiness checklist (issue #204)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** A published Course whose Term has ended — the checklist's target audience. */
  function endedPublishedCourse(): Course {
    const s = useStore.getState()
    return req(
      s.courses.find((c) => c.status === 'published' && isTermEnded(c, clock.now())),
      'seed: no published, Term-ended course'
    )
  }

  /** Strip every Grade and AttendanceRecord for the Course so both checks fail. */
  function makeBlocked(course: Course) {
    const s = useStore.getState()
    useStore.setState({
      grades: s.grades.filter((g) => g.courseId !== course.id),
      attendance: s.attendance.filter((a) => a.courseId !== course.id),
    })
    const ungraded = new Set(
      s.enrollments
        .filter((e) => e.courseId === course.id && e.status === 'approved')
        .map((e) => e.studentId)
    ).size
    const unrecorded = sessionsFor(course).filter((x) => parseISO(x.date) <= clock.now()).length
    return { ungraded, unrecorded }
  }

  /** Fill exactly the gaps closeReadiness reports so both checks pass. */
  function makeReady(course: Course) {
    const s = useStore.getState()
    const gaps = closeReadiness({
      course,
      enrollments: s.enrollments,
      grades: s.grades,
      attendance: s.attendance,
      now: clock.now(),
    })
    useStore.setState({
      grades: [
        ...s.grades,
        ...gaps.ungradedStudentIds.map((studentId, i) => ({
          id: `grade-ready-${i}`,
          studentId,
          courseId: course.id,
          score: 85,
          issuedAt: clock.now().toISOString(),
        })),
      ],
      attendance: [
        ...s.attendance,
        ...gaps.unrecordedSessions.map((session, i) => ({
          id: `att-ready-${i}`,
          courseId: course.id,
          studentId: 'stu-1',
          sessionDate: session.date,
          status: 'present' as const,
        })),
      ],
    })
  }

  it('shows an admin both fail rows with counts and a blocked verdict on a blocked course', async () => {
    const course = endedPublishedCourse()
    const { ungraded, unrecorded } = makeBlocked(course)
    expect(ungraded).toBeGreaterThan(0)
    expect(unrecorded).toBeGreaterThan(0)
    asRole('admin')
    renderPage(course.id)

    const badge = await screen.findByTestId('close-readiness-verdict')
    expect(badge).toHaveTextContent('Blocked')
    // Counts track the seed, so derive the plural form rather than hard-coding it.
    const students = ungraded === 1 ? 'student' : 'students'
    const sessions = unrecorded === 1 ? 'session' : 'sessions'
    expect(await screen.findByText(`${ungraded} ${students} ungraded`)).toBeInTheDocument()
    expect(await screen.findByText(`${unrecorded} ${sessions} unrecorded`)).toBeInTheDocument()
  })

  it('shows an admin both pass rows and a ready verdict once every gap is filled', async () => {
    const course = endedPublishedCourse()
    makeReady(course)
    asRole('admin')
    renderPage(course.id)

    const badge = await screen.findByTestId('close-readiness-verdict')
    expect(badge).toHaveTextContent('Ready to close')
    expect(await screen.findByText('All approved students are graded.')).toBeInTheDocument()
    expect(
      await screen.findByText('All past sessions have attendance records.')
    ).toBeInTheDocument()
  })

  it('never paints a blocked verdict on a ready course while grades are still loading', async () => {
    const course = endedPublishedCourse()
    makeReady(course)
    asRole('admin')
    // Hold the grades query open well past the course/enrollments queries so the
    // render window where grades are still [] is wide and deterministic instead
    // of a sub-tick race (the #182/#203 flake class).
    const listGrades = api.grades.list
    vi.spyOn(api.grades, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listGrades(filters)
    })
    renderPage(course.id)

    // The first checklist ever painted must already reflect resolved data: the
    // moment the verdict exists, it must be the ready verdict — never Blocked.
    const badge = await screen.findByTestId('close-readiness-verdict', {}, { timeout: 3000 })
    expect(badge).toHaveTextContent('Ready to close')
  })

  it('the first painted verdict is never a false Blocked while attendance still loads', async () => {
    const course = endedPublishedCourse()
    makeReady(course)
    asRole('admin')
    // Hold attendance open past grades so the window where the checklist gate
    // sees grades resolved but attendance still [] is wide and deterministic. A
    // gate that dropped attendance would paint a Blocked verdict in this window.
    const listAttendance = api.attendance.list
    vi.spyOn(api.attendance, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listAttendance(filters)
    })

    // Capture the verdict text the very first frame it exists — a waiting findBy*
    // could poll only after a flash had already resolved and miss it (ADR-0030).
    let firstVerdict: string | null = null
    const observer = new MutationObserver(() => {
      if (firstVerdict !== null) return
      const badge = document.querySelector('[data-testid="close-readiness-verdict"]')
      if (badge) firstVerdict = badge.textContent
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    try {
      renderPage(course.id)
      const badge = await screen.findByTestId('close-readiness-verdict', {}, { timeout: 3000 })
      expect(badge).toHaveTextContent('Ready to close')
      // The FIRST frame the verdict ever painted must already be the ready verdict.
      expect(firstVerdict).toContain('Ready to close')
    } finally {
      observer.disconnect()
    }
  })

  it('renders no checklist on a published mid-Term course', async () => {
    const s = useStore.getState()
    const midTerm = req(
      s.courses.find((c) => c.status === 'published' && !isTermEnded(c, clock.now())),
      'seed: no published mid-Term course'
    )
    asRole('admin')
    renderPage(midTerm.id)

    await screen.findByRole('heading', { name: shortCourseName(midTerm) })
    expect(screen.queryByTestId('close-readiness-verdict')).not.toBeInTheDocument()
  })

  it('renders no checklist on a closed course', async () => {
    const course = endedPublishedCourse()
    asRole('admin')
    useStore.getState().closeCourse(course.id)
    renderPage(course.id)

    await screen.findByRole('heading', { name: shortCourseName(course) })
    expect(screen.queryByTestId('close-readiness-verdict')).not.toBeInTheDocument()
  })

  it('renders no checklist for an enrolled Student on the same Term-ended course', async () => {
    const course = endedPublishedCourse()
    const s = useStore.getState()
    // Make stu-1 approved-enrolled (replacing any seeded non-approved record for
    // this course) so the page renders the self-view and the only reason the
    // checklist is absent is the missing close capability.
    useStore.setState({
      enrollments: [
        ...s.enrollments.filter((e) => !(e.courseId === course.id && e.studentId === 'stu-1')),
        {
          id: 'enr-readiness-self',
          studentId: 'stu-1',
          courseId: course.id,
          status: 'approved' as const,
          enrolledAt: clock.now().toISOString(),
          requestedAt: clock.now().toISOString(),
        },
      ],
    })
    asRole('student')
    renderPage(course.id)

    await screen.findByRole('heading', { name: shortCourseName(course) })
    expect(screen.queryByTestId('close-readiness-verdict')).not.toBeInTheDocument()
  })

  it('keeps the close button enabled and opening the confirm dialog on a blocked course', async () => {
    const course = endedPublishedCourse()
    makeBlocked(course)
    asRole('admin')
    renderPage(course.id)

    // The checklist reports blocked…
    expect(await screen.findByTestId('close-readiness-verdict')).toHaveTextContent('Blocked')
    // …but the close action is informational-only: still enabled, still confirms.
    const closeButton = await screen.findByRole('button', { name: 'Close course' })
    expect(closeButton).toBeEnabled()
    fireEvent.click(closeButton)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('<CoursesDetailPage /> — sessions surface & roster (issue 153, ADR-0001/0011/0037)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('holds the Needs-attendance queue until the attendance window resolves (no false flash)', async () => {
    const s = useStore.getState()
    const course = req(
      s.courses.find((c) => c.status === 'published' && isTermEnded(c, clock.now())),
      'seed: no published, Term-ended course'
    )
    asRole('admin')
    // Hold the attendance query open well past the course/enrollment gate so the
    // window where the section sees a default-[] attendance list is wide. A section
    // that dropped the resolveQueries gate would flash an "all past unrecorded" queue.
    const listAttendance = api.attendance.list
    vi.spyOn(api.attendance, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listAttendance(filters)
    })
    renderPage(course.id)

    // The Sessions surface paints once the course/enrollment gate resolves, while
    // attendance is still open — but its Needs-attendance queue is held, never a
    // false flash (ADR-0030/0037).
    await screen.findByRole('heading', { name: 'Sessions' })
    expect(screen.queryByRole('list', { name: 'Needs attendance' })).not.toBeInTheDocument()

    // Once attendance resolves the queue appears (the seed leaves past Sessions
    // unrecorded on every ended cohort).
    expect(
      await screen.findByRole('list', { name: 'Needs attendance' }, { timeout: 3000 })
    ).toBeInTheDocument()
  })

  it('shows the Course’s derived Sessions surface (session ordinal + date) to an admin', async () => {
    const { gradedCourse } = fixtures()
    const sessions = sessionsFor(gradedCourse)
    expect(sessions.length).toBeGreaterThan(0)
    asRole('admin')
    renderPage(gradedCourse.id)

    // The one state-grouped Sessions surface (ADR-0037) replaces the old Schedule
    // wall. gradedCourse is an ended cohort, so its past Sessions surface in the
    // expanded Needs-attendance queue (gated on the attendance window → findBy).
    const heading = await screen.findByRole('heading', { name: 'Sessions' })
    const section = req(
      heading.closest('section') ?? undefined,
      'Sessions heading has no <section>'
    )
    const rows = await within(section).findAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(0)
    // Each row is a derived Session labeled by ordinal + date — nothing stored.
    expect(rows[0]).toHaveTextContent(/Session \d+ · /)
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
    expect(await within(section).findByText(fullName(trainee))).toBeInTheDocument()
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
    expect(await within(section).findByText(fullName(trainee))).toBeInTheDocument()
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
    expect(await within(section).findByText(fullName(trainee))).toBeInTheDocument()
  })

  it('renders a closed Course as a Finished badge (ADR-0042)', async () => {
    const { publishedOwnCourse } = fixtures()
    asRole('admin')
    useStore.getState().closeCourse(publishedOwnCourse.id)
    renderPage(publishedOwnCourse.id)

    const badge = await screen.findByTestId('course-status-badge')
    expect(badge).toHaveTextContent('Finished')
  })

  it('renders a published Course’s derived display state, never Finished (ADR-0042)', async () => {
    const { publishedOwnCourse } = fixtures()
    expect(publishedOwnCourse.status).toBe('published')
    asRole('admin')
    renderPage(publishedOwnCourse.id)

    // A published cohort derives Starts soon / In progress / Term ended by its Term
    // dates — computed here so the assertion tracks the seed rather than hard-coding.
    const expected = {
      startsSoon: 'Starts soon',
      inProgress: 'In progress',
      termEnded: 'Term ended',
    }[
      courseDisplayState(publishedOwnCourse, clock.now()) as
        | 'startsSoon'
        | 'inProgress'
        | 'termEnded'
    ]

    const badge = await screen.findByTestId('course-status-badge')
    expect(badge).toHaveTextContent(expected)
    expect(badge).not.toHaveTextContent('Finished')
  })
})
