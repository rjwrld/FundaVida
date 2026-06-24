import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { EnrollStudentDialog } from '@/components/courses/EnrollStudentDialog'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderDialog(courseId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <EnrollStudentDialog open onOpenChange={vi.fn()} courseId={courseId} />
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<EnrollStudentDialog /> Sede scoping (ADR-0011)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('offers only students at the course Sede, never cross-Sede ones', async () => {
    const user = userEvent.setup()
    const { courses, students, enrollments } = useStore.getState()
    const course = courses[0]
    if (!course) throw new Error('expected at least one seeded course')

    const enrolledIds = new Set(
      enrollments.filter((e) => e.courseId === course.id).map((e) => e.studentId)
    )
    const eligibleUnenrolled = students.filter((s) => !enrolledIds.has(s.id))
    const sameSede = eligibleUnenrolled.filter((s) => s.sede === course.sede)
    // The seed must give this course some cross-Sede students to exclude, or the
    // assertion proves nothing.
    expect(sameSede.length).toBeGreaterThan(0)
    expect(sameSede.length).toBeLessThan(eligibleUnenrolled.length)

    renderDialog(course.id)
    await user.click(screen.getByRole('combobox'))
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(sameSede.length)

    const sedeByName = new Map(students.map((s) => [`${s.firstName} ${s.lastName}`, s.sede]))
    options.forEach((opt) => {
      expect(sedeByName.get(opt.textContent ?? '')).toBe(course.sede)
    })
  })
})
