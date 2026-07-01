import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import type { AttendanceRecord, Grade, Student } from '@/types'
import { AtRiskStudents } from '../AtRiskStudents'

const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function makeStudent(id: string, firstName: string): Student {
  return {
    id,
    firstName,
    lastName: 'Q',
    email: `${id}@x.cr`,
    gender: 'F',
    sede: 'Hatillo',
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'primaria',
    guardian: { name: 'G', relationship: 'madre', phone: '', email: '' },
    enrolledCourseIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}
const grade = (studentId: string, score: number): Grade => ({
  id: `gra-${studentId}`,
  studentId,
  courseId: 'cou-1',
  score,
  issuedAt: '2026-06-01',
})
const att = (
  studentId: string,
  status: AttendanceRecord['status'],
  n: number
): AttendanceRecord => ({
  id: `att-${studentId}-${status}-${n}`,
  courseId: 'cou-1',
  studentId,
  sessionDate: '2026-06-01',
  status,
})

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AtRiskStudents />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('AtRiskStudents', () => {
  let snapshot: { students: Student[]; grades: Grade[]; attendance: AttendanceRecord[] }

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
    const s = useStore.getState()
    snapshot = { students: s.students, grades: s.grades, attendance: s.attendance }
  })
  afterEach(() => {
    useStore.setState(snapshot)
  })

  it('lists at-risk students with the reason, linking to their profile, and omits safe students', async () => {
    const failing = makeStudent('stu-fail', 'Ana')
    const safe = makeStudent('stu-safe', 'Beto')
    useStore.setState({
      students: [failing, safe],
      grades: [grade('stu-fail', 55), grade('stu-safe', 92)],
      attendance: [att('stu-safe', 'present', 1), att('stu-safe', 'present', 2)],
    })

    renderCard()

    const nameEl = await screen.findByText('Ana Q')
    expect(nameEl.closest('a')).toHaveAttribute('href', '/app/students/stu-fail')
    expect(screen.getByText(/failing grade/i)).toBeInTheDocument()
    expect(screen.queryByText('Beto Q')).not.toBeInTheDocument()
  })

  it('shows the empty state when no student is at risk', async () => {
    useStore.setState({
      students: [makeStudent('stu-ok', 'Cami')],
      grades: [grade('stu-ok', 88)],
      attendance: [att('stu-ok', 'present', 1)],
    })

    renderCard()

    expect(await screen.findByText('No students need attention right now.')).toBeInTheDocument()
  })
})
