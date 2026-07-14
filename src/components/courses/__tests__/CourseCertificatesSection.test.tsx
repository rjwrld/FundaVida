import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { I18nProvider } from '@/lib/i18n'
import { CourseCertificatesSection } from '@/components/courses/CourseCertificatesSection'
import { fireConfetti } from '@/lib/confetti'
import { isPassingScore } from '@/lib/certificates'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Course } from '@/types'

vi.mock('@/lib/confetti', () => ({ fireConfetti: vi.fn() }))

// The celebration trigger opts out through the component's own
// `useReducedMotion()` read (ADR-0027) — mock the hook, not `MotionConfig`,
// which only steers framer's animation engine, not this verdict.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

function renderSection(course: Course) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const view = render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <CourseCertificatesSection course={course} />
      </QueryClientProvider>
    </I18nProvider>
  )
  return { client, view }
}

function req<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

/**
 * A published seed Course whose close will emit at least one Certificate: it
 * has an approved Enrollment with a passing Grade (ADR-0024). Derived from the
 * deterministic seed rather than hard-coded, so it tracks seed drift.
 */
function closableCourse(): Course {
  const s = useStore.getState()
  return req(
    s.courses.find(
      (c) =>
        c.status === 'published' &&
        s.enrollments.some(
          (e) =>
            e.courseId === c.id &&
            e.status === 'approved' &&
            s.grades.some(
              (g) => g.courseId === c.id && g.studentId === e.studentId && isPassingScore(g.score)
            )
        )
    ),
    'seed has no closable course with a passing approved student'
  )
}

describe('<CourseCertificatesSection /> — issuance celebration (ADR-0047 phase 6b)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('admin')
    vi.mocked(fireConfetti).mockClear()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('celebrates certificates issued by a close while the section is in view', async () => {
    const course = closableCourse()
    const { client } = renderSection(course)

    // The section resolves to its pre-close empty state first.
    await screen.findByText('Certificates appear here once this course is closed.')
    // The empty state renders while the list is still fetching; the seen-set
    // baseline seeds from the FIRST resolve, so let it land before closing.
    await waitFor(() => expect(client.isFetching()).toBe(0))
    expect(fireConfetti).not.toHaveBeenCalled()

    // Close the course — certificates are emitted — and let the write-set
    // invalidation refetch the list, as the real mutation hook would (ADR-0029).
    useStore.getState().closeCourse(course.id)
    await client.invalidateQueries({ queryKey: ['certificates'] })

    await waitFor(() => {
      expect(fireConfetti).toHaveBeenCalledTimes(1)
    })
    // Every freshly-issued card carries the shimmer sweep.
    const issued = useStore.getState().certificates.filter((c) => c.courseId === course.id)
    expect(issued.length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('celebration-sweep')).toHaveLength(issued.length)
  })

  it('never celebrates certificates that already existed on mount', async () => {
    const course = closableCourse()
    // Close BEFORE mounting: the certificates exist when the section first loads.
    useStore.getState().closeCourse(course.id)
    renderSection(course)

    const issued = useStore.getState().certificates.filter((c) => c.courseId === course.id)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /open preview/i })).toHaveLength(issued.length)
    })

    expect(fireConfetti).not.toHaveBeenCalled()
    expect(screen.queryByTestId('celebration-sweep')).not.toBeInTheDocument()
  })

  it('does not re-celebrate on a refetch that brings nothing new', async () => {
    const course = closableCourse()
    const { client } = renderSection(course)
    await screen.findByText('Certificates appear here once this course is closed.')
    // The empty state renders while the list is still fetching; the seen-set
    // baseline seeds from the FIRST resolve, so let it land before closing.
    await waitFor(() => expect(client.isFetching()).toBe(0))

    useStore.getState().closeCourse(course.id)
    await client.invalidateQueries({ queryKey: ['certificates'] })
    await waitFor(() => expect(fireConfetti).toHaveBeenCalledTimes(1))

    // A second invalidation returns the same certificates — no second burst.
    await client.invalidateQueries({ queryKey: ['certificates'] })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /open preview/i }).length).toBeGreaterThan(0)
    })
    expect(fireConfetti).toHaveBeenCalledTimes(1)
  })

  it('skips confetti and shimmer under prefers-reduced-motion', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const course = closableCourse()
    const { client } = renderSection(course)
    await screen.findByText('Certificates appear here once this course is closed.')
    // The empty state renders while the list is still fetching; the seen-set
    // baseline seeds from the FIRST resolve, so let it land before closing.
    await waitFor(() => expect(client.isFetching()).toBe(0))

    useStore.getState().closeCourse(course.id)
    await client.invalidateQueries({ queryKey: ['certificates'] })

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /open preview/i }).length).toBeGreaterThan(0)
    })
    expect(fireConfetti).not.toHaveBeenCalled()
    expect(screen.queryByTestId('celebration-sweep')).not.toBeInTheDocument()
  })
})
