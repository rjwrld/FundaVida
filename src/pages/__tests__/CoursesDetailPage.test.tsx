import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatGrade } from '@/lib/format'
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
  return { self, gradedCourse, ownGrade, classmate, ungradedCourse, notEnrolled }
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
      expect(screen.getByRole('heading', { name: gradedCourse.name })).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: gradedCourse.name })).toBeInTheDocument()
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

  it('shows an admin the full enrollment roster', async () => {
    const { gradedCourse, classmate } = fixtures()
    asRole('admin')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: gradedCourse.name })).toBeInTheDocument()
    })
    expect(screen.getByText(`${classmate.firstName} ${classmate.lastName}`)).toBeInTheDocument()
  })

  it('shows the Course’s Teacher the full enrollment roster', async () => {
    const { gradedCourse, classmate } = fixtures()
    // cou-1 is owned by tea-1, the seeded teacher persona.
    expect(gradedCourse.teacherId).toBe('tea-1')
    asRole('teacher')
    renderPage(gradedCourse.id)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: gradedCourse.name })).toBeInTheDocument()
    })
    expect(screen.getByText(`${classmate.firstName} ${classmate.lastName}`)).toBeInTheDocument()
  })
})
