import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { WelcomePage } from '@/pages/WelcomePage'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderWelcome() {
  function LocationDisplay() {
    const location = useLocation()
    return <div data-testid="location">{location.pathname}</div>
  }
  return render(
    <I18nProvider>
      <MemoryRouter
        initialEntries={['/welcome']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <WelcomePage />
        <LocationDisplay />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<WelcomePage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('renders the localized heading and a button per role', () => {
    renderWelcome()
    expect(screen.getByRole('heading', { name: /welcome back\./i })).toBeInTheDocument()
    // Role labels start the button's accessible name; anchor so blurbs (which mention
    // "students") don't cause cross-matches.
    expect(screen.getByRole('button', { name: /^admin/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^teacher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^student/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^tcu/i })).toBeInTheDocument()
  })

  it('renders the Spanish heading when the locale is es', () => {
    useStore.getState().setLocale('es')
    renderWelcome()
    expect(screen.getByRole('heading', { name: /bienvenido de nuevo\./i })).toBeInTheDocument()
  })

  it('selects a non-teacher role and navigates to /app', async () => {
    const user = userEvent.setup()
    renderWelcome()
    await user.click(screen.getByRole('button', { name: /^admin/i }))
    expect(useStore.getState().role).toBe('admin')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })

  it('lands the teacher persona on its ungraded ended Course (golden-path entry)', async () => {
    const user = userEvent.setup()
    // An ended Course the teacher persona (tea-1) owns that still has an ungraded
    // enrollment (matches landingPathForRole — a Course with a few grades but
    // ungraded students left still qualifies). Switching to teacher opens it.
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

    renderWelcome()
    await user.click(screen.getByRole('button', { name: /^teacher/i }))
    expect(useStore.getState().role).toBe('teacher')
    expect(screen.getByTestId('location')).toHaveTextContent(`/app/courses/${goldenPath.id}`)
  })

  it('keeps the welcome illustration text-free (decorative image)', () => {
    renderWelcome()
    const img = document.querySelector('img[src="/illustrations/login-hero.svg"]')
    expect(img).toBeTruthy()
    expect(img).toHaveAttribute('alt', '')
  })
})
