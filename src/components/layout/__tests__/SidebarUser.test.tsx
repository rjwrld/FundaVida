import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { SidebarUser } from '@/components/layout/SidebarUser'
import { SidebarProvider } from '@/components/ui/sidebar'
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

function renderUser() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/app']}>
        <SidebarProvider>
          <SidebarUser />
          <LocationDisplay />
        </SidebarProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<SidebarUser />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('renders nothing when no role is selected', () => {
    const { container } = renderUser()
    expect(container.querySelector('[data-slot="sidebar-menu-button"]')).toBeNull()
  })

  // The demo signs each role in as a persona: the footer names the person and the role
  // they hold, which is what the block's user slot is for.
  it('names the signed-in persona and its role', () => {
    useStore.getState().setRole('teacher')
    renderUser()

    const teacher = useStore.getState().teachers.find((t) => t.id === 'tea-1')
    if (!teacher) throw new Error('seed should carry the tea-1 persona')
    expect(screen.getByText(fullName(teacher))).toBeInTheDocument()
    expect(screen.getByText('Teacher')).toBeInTheDocument()
  })

  // Admin is the one role with no person record behind it — it must not render an empty
  // name line above its role.
  it('falls back to the role alone when the persona has no person record', () => {
    useStore.getState().setRole('admin')
    renderUser()

    const trigger = screen.getByRole('button', { name: 'Admin' })
    expect(trigger).toBeInTheDocument()
  })

  /**
   * `role` and `currentUserId` hydrate from two independent localStorage keys with no
   * cross-validation (data/persistence.ts), so a half-written storage boots the app with a
   * role and no persona id. The footer must still render: it is the app's only role switch
   * since the header's left (#307), and gating it on the persona id would strand the user
   * in the very state a role switch repairs.
   */
  it('still offers the role switch when the persona id is missing', async () => {
    const user = userEvent.setup()
    useStore.setState({ role: 'teacher', currentUserId: null })
    renderUser()

    // No person record to name, so it falls back to the role — the same shape admin uses.
    const trigger = screen.getByRole('button', { name: 'Teacher' })
    expect(trigger).toBeInTheDocument()

    // ...and switching repairs the state, because setRole rebinds the persona id.
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: /admin/i }))
    expect(useStore.getState().currentUserId).toBe('admin')
  })

  it('opens the role menu, switches role, and navigates', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    renderUser()

    await user.click(screen.getByRole('button', { name: 'Admin' }))
    await user.click(screen.getByRole('menuitem', { name: /student/i }))

    expect(useStore.getState().role).toBe('student')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })

  it('lands the teacher persona on its ungraded ended Course (golden-path entry)', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')

    // The golden-path runway: an ended Course tea-1 owns that still has an ungraded
    // enrollment (matches landingPathForRole). Switching to teacher lands on it.
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

    renderUser()
    await user.click(screen.getByRole('button', { name: 'Admin' }))
    await user.click(screen.getByRole('menuitem', { name: /teacher/i }))

    expect(useStore.getState().role).toBe('teacher')
    expect(screen.getByTestId('location')).toHaveTextContent(`/app/courses/${goldenPath.id}`)
  })
})
