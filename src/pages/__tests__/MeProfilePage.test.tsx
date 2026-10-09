import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
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

  // The header breadcrumb and sidebar already lead home; the profile header needs
  // no extra "Back to home" button.
  it('has no "Back to home" button in the profile header', async () => {
    const { student } = self()
    renderMe()

    await screen.findByRole('heading', { name: fullName(student) })
    expect(screen.queryByRole('link', { name: 'Back to home' })).not.toBeInTheDocument()
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

  // The per-Course roll-up lives on the dashboard's My courses table, so /me is
  // just who the student is: Identity, Certificates, Guardian (ADR-0051).
  it('shows identity, certificates, and guardian, and no enrollments table', async () => {
    const { student } = self()
    renderMe()

    await screen.findByRole('heading', { name: fullName(student) })
    expect(await screen.findByRole('heading', { name: 'Certificates' })).toBeInTheDocument()
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Guardian')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Enrollments' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the passing course certificate the student earned', async () => {
    const { student } = self()
    const cert = useStore.getState().certificates.find((c) => c.studentId === student.id)
    if (!cert) return
    const course = req(
      useStore.getState().courses.find((c) => c.id === cert.courseId),
      'seed: certificate course missing'
    )
    renderMe()
    expect(await screen.findAllByText(course.name)).not.toHaveLength(0)
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
