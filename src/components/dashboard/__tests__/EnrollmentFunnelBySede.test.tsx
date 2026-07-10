import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import type { Course, Enrollment } from '@/types'
import { EnrollmentFunnelBySede } from '../EnrollmentFunnelBySede'

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
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
    const s = useStore.getState()
    snapshot = { courses: s.courses, enrollments: s.enrollments }
  })
  afterEach(() => {
    useStore.setState(snapshot)
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
    const card = container.querySelector('[data-slot="card"]') as HTMLElement

    expect(await within(card).findByText('Hatillo')).toBeInTheDocument()
    // rejected is excluded: 3 approved, 2 pending.
    expect(within(card).getByText('3 approved · 2 pending')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /review enrollments/i })
    expect(link).toHaveAttribute('href', '/app/enrollments')
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
