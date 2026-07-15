import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { formatGrade, formatPercent } from '@/lib/format'
import { shortCourseName } from '@/lib/courseName'
import { fullName } from '@/lib/personName'
import { MeProfilePage } from '@/pages/MeProfilePage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderMe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app/me']}>
          <Routes>
            <Route path="/app" element={<div>DASHBOARD</div>} />
            <Route path="/app/me" element={<MeProfilePage />} />
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

// The Student persona (stu-1) the app logs in as. Derived from the seeded store
// so the assertions track the demo data (faker.seed(42)).
function self() {
  const s = useStore.getState()
  const student = req(
    s.students.find((st) => st.id === s.currentUserId),
    'seed: logged-in student missing'
  )
  const passingGrade = req(
    s.grades.find((g) => g.studentId === student.id && g.score >= 70),
    'seed: stu-1 has no passing grade'
  )
  const passingCourse = req(
    s.courses.find((c) => c.id === passingGrade.courseId),
    'seed: passing grade course missing'
  )
  return { student, passingGrade, passingCourse }
}

describe('<MeProfilePage /> (#166)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('student')
    useStore.getState().setLocale('en')
  })

  it('shows the logged-in student’s name, campus, and educational level', async () => {
    const { student } = self()
    renderMe()

    expect(
      await screen.findByRole('heading', {
        name: fullName(student),
      })
    ).toBeInTheDocument()
    expect(screen.getByText(student.sede)).toBeInTheDocument()
    const levelLabel = student.educationalLevel === 'primaria' ? 'Primary' : 'Secondary'
    expect(screen.getByText(levelLabel)).toBeInTheDocument()
  })

  it('shows the encargado (guardian) name, phone, and email', async () => {
    const { student } = self()
    renderMe()

    expect(await screen.findByText(student.guardian.name)).toBeInTheDocument()
    expect(screen.getByText(student.guardian.phone)).toBeInTheDocument()
    expect(screen.getByText(student.guardian.email)).toBeInTheDocument()
  })

  it('lists own enrollments with attendance % and a passing grade treatment', async () => {
    const { student, passingGrade, passingCourse } = self()
    expect(passingGrade.score).toBeGreaterThanOrEqual(70)
    renderMe()

    const link = await screen.findByRole('link', { name: shortCourseName(passingCourse) })
    const row = req(link.closest('tr') ?? undefined, 'enrollment row missing')
    // The grade cell fills from a separate query that can resolve after the
    // enrollment link, so await it rather than reading the row synchronously.
    expect(await within(row).findByText(formatGrade(passingGrade.score, 'en'))).toBeInTheDocument()
    expect(within(row).getByText('Passing')).toBeInTheDocument()

    // The per-course attendance % renders for a course with attendance records.
    const records = useStore
      .getState()
      .attendance.filter((a) => a.studentId === student.id && a.courseId === passingCourse.id)
    if (records.length > 0) {
      const present = records.filter((r) => r.status === 'present').length
      expect(
        await within(row).findByText(formatPercent(present / records.length, 'en'))
      ).toBeInTheDocument()
    }
  })

  it('renders a certificates section', async () => {
    self()
    renderMe()
    expect(await screen.findByRole('heading', { name: 'Certificates' })).toBeInTheDocument()
  })

  it('is read-only: offers no Edit or Delete affordance', async () => {
    const { student } = self()
    renderMe()

    await screen.findByRole('heading', { name: fullName(student) })
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('redirects a non-student role away (no self-profile)', async () => {
    useStore.getState().setRole('admin')
    renderMe()

    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
  })
})
