import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
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
        <MemoryRouter>
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
    vi.restoreAllMocks()
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

  // The verdict joins three reads. Holding grades open past students would let an
  // ungated card judge everyone on an empty ([]) grade list and flash the
  // all-clear before the failing student arrives (ADR-0030).
  it('never paints the all-clear before every read resolves', async () => {
    useStore.setState({
      students: [makeStudent('stu-fail', 'Ana')],
      grades: [grade('stu-fail', 55)],
      attendance: [],
    })
    const listGrades = api.grades.list
    vi.spyOn(api.grades, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listGrades(...args)
    })

    let sawAllClear = false
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes('No students need attention')) sawAllClear = true
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    try {
      renderCard()
      expect(await screen.findByText('Ana Q')).toBeInTheDocument()
      expect(sawAllClear).toBe(false)
    } finally {
      observer.disconnect()
    }
  })

  it('counts the students at risk in the header and links onward to the roster', async () => {
    useStore.setState({
      students: [makeStudent('stu-a', 'Ana'), makeStudent('stu-b', 'Bea')],
      grades: [grade('stu-a', 50), grade('stu-b', 40)],
      attendance: [],
    })

    renderCard()

    const region = await screen.findByRole('region', { name: 'Students at risk' })
    expect(region).toHaveTextContent('2')
    expect(screen.getByRole('link', { name: /view all students/i })).toHaveAttribute(
      'href',
      '/app/students'
    )
  })
})
