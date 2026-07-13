import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import type { Course, Enrollment } from '@/types'
import { EnrollmentFunnelBySede } from '../EnrollmentFunnelBySede'

// The chart draw-in (phase 6a) reads framer's `useReducedMotion()` and hands
// recharts its animation props; mock the hook (data-table/tabs precedent) so
// the reduced-motion path can be driven from a test.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function makeCourse(id: string, sede: Course['sede']): Course {
  return {
    id,
    name: `Course ${id}`,
    description: '',
    sede,
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: '2026-01-01', end: '2026-06-01' },
    meetingDays: ['mon'],
    createdAt: '2026-01-01',
  }
}
const enr = (courseId: string, status: Enrollment['status'], n: number): Enrollment => ({
  id: `enr-${courseId}-${status}-${n}`,
  studentId: `stu-${n}`,
  courseId,
  enrolledAt: '2026-05-01',
  status,
  requestedAt: '2026-05-01',
})

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <EnrollmentFunnelBySede />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('EnrollmentFunnelBySede', () => {
  let snapshot: { courses: Course[]; enrollments: Enrollment[] }

  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false)
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
    const s = useStore.getState()
    snapshot = { courses: s.courses, enrollments: s.enrollments }
  })
  afterEach(() => {
    useStore.setState(snapshot)
    vi.restoreAllMocks()
  })

  it('shows per-Sede pending vs approved counts and links to the enrollments page', async () => {
    useStore.setState({
      courses: [makeCourse('cou-h', 'Hatillo')],
      enrollments: [
        enr('cou-h', 'pending', 1),
        enr('cou-h', 'pending', 2),
        enr('cou-h', 'approved', 3),
        enr('cou-h', 'approved', 4),
        enr('cou-h', 'approved', 5),
        enr('cou-h', 'rejected', 6),
      ],
    })

    const { container } = renderCard()

    // The card is gated behind resolveQueries (ADR-0030), so the first paint is
    // a skeleton; wait for the data to land before scoping to the card.
    expect(await screen.findByText('Hatillo')).toBeInTheDocument()
    const card = container.querySelector('[data-slot="card"]') as HTMLElement
    // rejected is excluded: 3 approved, 2 pending.
    expect(within(card).getByText('3 approved · 2 pending')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /review enrollments/i })
    expect(link).toHaveAttribute('href', '/app/enrollments')
  })

  it('holds a skeleton until both queries resolve — never flashes the empty state (ADR-0030)', async () => {
    // Hold the Courses read open past the enrollments so an ungated funnel
    // would paint "No enrollment activity yet" before the Sede mapping lands.
    const listCourses = api.courses.list
    vi.spyOn(api.courses, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listCourses(...args)
    })
    useStore.setState({
      courses: [makeCourse('cou-h', 'Hatillo')],
      enrollments: [enr('cou-h', 'approved', 1)],
    })

    renderCard()

    // First synchronous paint: gate pending → skeleton, no title, no empty copy.
    expect(screen.queryByText('Enrollment funnel by campus')).not.toBeInTheDocument()
    expect(screen.queryByText('No enrollment activity yet.')).not.toBeInTheDocument()

    expect(await screen.findByText('Hatillo')).toBeInTheDocument()
    expect(screen.getByText('Enrollment funnel by campus')).toBeInTheDocument()
  })

  it('still renders the chart under prefers-reduced-motion — only the draw-in is dropped', async () => {
    // The animation props themselves are pinned in lib/__tests__/motion.test.ts
    // (chartDrawIn); this drives the same hook the component reads and checks the
    // chart surface still mounts. (jsdom gives ResponsiveContainer no box, so the
    // SVG itself never paints here — the container and the sr-only summary are
    // what can be observed.)
    vi.mocked(useReducedMotion).mockReturnValue(true)
    useStore.setState({
      courses: [makeCourse('cou-h', 'Hatillo')],
      enrollments: [enr('cou-h', 'approved', 1), enr('cou-h', 'pending', 2)],
    })

    const { container } = renderCard()

    expect(await screen.findByText('Hatillo')).toBeInTheDocument()
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
    expect(screen.getByText('1 approved · 1 pending')).toBeInTheDocument()
  })

  it('shows the empty state when there is no pending or approved activity', async () => {
    useStore.setState({
      courses: [makeCourse('cou-h', 'Hatillo')],
      enrollments: [enr('cou-h', 'rejected', 1), enr('cou-h', 'withdrawn', 2)],
    })

    renderCard()

    expect(await screen.findByText('No enrollment activity yet.')).toBeInTheDocument()
  })
})
