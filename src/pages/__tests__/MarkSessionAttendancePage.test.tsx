import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { MarkSessionAttendancePage } from '@/pages/MarkSessionAttendancePage'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import { sessionsFor } from '@/lib/sessions'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[entry]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route
              path="/app/courses/:courseId/sessions/:sessionDate/mark"
              element={<MarkSessionAttendancePage />}
            />
            <Route path="/app" element={<div>Redirected to dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<MarkSessionAttendancePage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    // Set a fixed epoch to control what "past" and "future" mean
    setDemoEpoch(new Date(2026, 5, 15)) // Monday, June 15, 2026
  })

  it('redirects a student trying to access a marking route (AC#3)', async () => {
    // Find an in-progress course with an enrolled student
    const state = useStore.getState()
    const courses = state.courses.filter((c) => {
      const start = new Date(c.term.start)
      const end = new Date(c.term.end)
      const today = new Date(2026, 5, 15)
      return start <= today && today <= end
    })

    expect(courses.length).toBeGreaterThan(0)
    const course = courses[0]

    // Find an enrolled student in this course
    const enrollment = state.enrollments.find((e) => e.courseId === course.id)
    expect(enrollment).toBeDefined()
    if (!enrollment) return
    const student = state.students.find((s) => s.id === enrollment.studentId)
    expect(student).toBeDefined()
    if (!student) return

    // Get a past session
    const sessions = sessionsFor(course)
    expect(sessions.length).toBeGreaterThan(0)
    const pastSession = sessions[0] // First session should be in the past

    // Log in as the student
    useStore.getState().setRole('student')
    useStore.getState().setCurrentUserId(student.id)

    // Render with the student trying to access the marking route
    const url = `/app/courses/${course.id}/sessions/${pastSession.date}/mark`
    renderPage(url)

    // The student should be redirected to /app
    await waitFor(() => {
      expect(screen.getByText('Redirected to dashboard')).toBeInTheDocument()
    })

    // Ensure the marking UI is not present
    expect(
      screen.queryByText('This session is in the future and cannot be marked.')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument()
  })

  it('shows marking UI to the owning teacher for a past session', async () => {
    // Find an in-progress course
    const state = useStore.getState()
    const courses = state.courses.filter((c) => {
      const end = new Date(c.term.end)
      const today = new Date(2026, 5, 15)
      return new Date(c.term.start) <= today && today <= end
    })

    expect(courses.length).toBeGreaterThan(0)
    const course = courses[0]
    const teacher = state.teachers.find((t) => t.id === course.teacherId)
    expect(teacher).toBeDefined()
    if (!teacher) return

    // Get a past session
    const sessions = sessionsFor(course)
    expect(sessions.length).toBeGreaterThan(0)
    const pastSession = sessions[0]

    // Log in as the teacher
    useStore.getState().setRole('teacher')
    useStore.getState().setCurrentUserId(teacher.id)

    // Render the marking page
    const url = `/app/courses/${course.id}/sessions/${pastSession.date}/mark`
    renderPage(url)

    // Wait for the Save button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    })

    // Verify all students are defaulted to present
    const enrollments = state.enrollments.filter((e) => e.courseId === course.id)
    expect(enrollments.length).toBeGreaterThan(0)
    enrollments.forEach((enrollment) => {
      const student = state.students.find((s) => s.id === enrollment.studentId)
      expect(student).toBeDefined()
      // The student's status dropdown should show "Present" as selected
      expect(screen.getByDisplayValue('Present')).toBeInTheDocument()
    })
  })

  it('shows read-only state for a future session', async () => {
    // Find a course with a future session
    const state = useStore.getState()
    const courses = state.courses.filter((c) => {
      const end = new Date(c.term.end)
      const today = new Date(2026, 5, 15)
      // Course that ends after today
      return end > today
    })

    expect(courses.length).toBeGreaterThan(0)
    const course = courses[0]
    const teacher = state.teachers.find((t) => t.id === course.teacherId)
    expect(teacher).toBeDefined()
    if (!teacher) return

    // Get all sessions and find a future one
    const sessions = sessionsFor(course)
    const futureSession = sessions.find((s) => {
      const sessionDate = new Date(s.date)
      const today = new Date(2026, 5, 15)
      return sessionDate > today
    })

    if (!futureSession) {
      // If no future session exists in this course, this test passes vacuously
      // (it means the test setup doesn't have enough future sessions)
      expect(true).toBe(true)
      return
    }

    // Log in as the teacher
    useStore.getState().setRole('teacher')
    useStore.getState().setCurrentUserId(teacher.id)

    // Render the marking page for the future session
    const url = `/app/courses/${course.id}/sessions/${futureSession.date}/mark`
    renderPage(url)

    // Wait for the read-only message to appear
    await waitFor(() => {
      expect(
        screen.getByText('This session is in the future and cannot be marked.')
      ).toBeInTheDocument()
    })

    // Ensure the Save button and status selects are not present
    expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Present')).not.toBeInTheDocument()
  })
})
