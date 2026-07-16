import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { Hero } from '../Hero'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import { fullName } from '@/lib/personName'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderHero() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <Hero />
        <LocationDisplay />
      </MemoryRouter>
    </I18nProvider>
  )
}

function personaOrThrow<T extends { id: string }>(people: T[], id: string): T {
  const person = people.find((p) => p.id === id)
  if (!person) throw new Error(`seed should carry the ${id} persona`)
  return person
}

describe('<Hero />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('renders the capability headline as a level-1 heading', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Run a school from your browser.' })
    ).toBeInTheDocument()
  })

  it('carries the provenance in the eyebrow and subcopy', () => {
    renderHero()
    expect(screen.getByText(/Shipped to a real foundation · 2025/)).toBeInTheDocument()
    expect(screen.getByText(/delivered to FundaVida as a production platform/)).toBeInTheDocument()
  })

  it('renders the admin fast path and the mono footnote', () => {
    renderHero()
    expect(screen.getByRole('button', { name: 'Enter as admin' })).toBeInTheDocument()
    expect(screen.getByText(/No signup/)).toBeInTheDocument()
    expect(screen.getByText('faker(42)')).toBeInTheDocument()
  })

  it('renders the GitHub link with safe link rels', () => {
    renderHero()
    const githubLink = screen.getByRole('link', { name: /view on github/i })
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  // The four persona badges name the seeded people behind the role ids; admin
  // is a sentinel id with no person record, so its badge names the office.
  it('names the seeded persona on each badge', () => {
    renderHero()
    const { teachers, students, tcuTrainees } = useStore.getState()
    const teacher = personaOrThrow(teachers, 'tea-1')
    const student = personaOrThrow(students, 'stu-1')
    const trainee = personaOrThrow(tcuTrainees, 'tcu-1')

    expect(
      screen.getByRole('button', {
        name: `Admin FundaVida Full control — courses, certificates, audit log.`,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `Teacher ${fullName(teacher)} Your courses, attendance, and grading.`,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `Student ${fullName(student)} Your enrollments, progress, and certificates.`,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `TCU ${fullName(trainee)} Your assigned course and community-work log.`,
      })
    ).toBeInTheDocument()
  })

  it('signs in and lands on the app home when a non-teacher badge is clicked', async () => {
    const user = userEvent.setup()
    renderHero()

    await user.click(screen.getByRole('button', { name: /^Student / }))

    expect(useStore.getState().role).toBe('student')
    expect(useStore.getState().currentUserId).toBe('stu-1')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })

  it('lands the teacher badge on its ungraded ended Course (golden-path entry)', async () => {
    const user = userEvent.setup()

    // The golden-path runway: an ended Course tea-1 owns that still has an
    // ungraded enrollment (matches landingPathForRole).
    const { courses, grades, enrollments } = useStore.getState()
    const now = clock.now()
    const goldenPath = courses.find(
      (c) =>
        c.teacherId === 'tea-1' &&
        new Date(c.term.end) < now &&
        enrollments.some(
          (e) =>
            e.courseId === c.id &&
            !grades.some((g) => g.studentId === e.studentId && g.courseId === c.id)
        )
    )
    if (!goldenPath) throw new Error('seed should leave tea-1 an ungraded ended Course')

    renderHero()
    await user.click(screen.getByRole('button', { name: /^Teacher / }))

    expect(useStore.getState().role).toBe('teacher')
    expect(screen.getByTestId('location')).toHaveTextContent(`/app/courses/${goldenPath.id}`)
  })
})
