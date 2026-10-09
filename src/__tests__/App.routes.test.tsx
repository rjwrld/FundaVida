import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/App'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import { courseDisplayState } from '@/lib/courseDisplayState'
import { effectiveSessions, isSessionRecordable } from '@/lib/sessions'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Role } from '@/types'

/**
 * The real route table (App.tsx) under each role: a destination a role's nav no
 * longer offers must not stay reachable by deep link either (ADR-0010/0051) —
 * RoleGate bounces it to the dashboard — while the surfaces that moved onto the
 * Course (marking) stay reachable.
 */
function renderAppAt(path: string) {
  window.history.replaceState({}, '', path)
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('App routes per role (ADR-0051)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it.each([
    ['student', '/app/programs'],
    ['student', '/app/grades'],
    ['student', '/app/attendance'],
    ['student', '/app/certificates'],
    ['teacher', '/app/programs'],
    ['teacher', '/app/grades'],
    ['teacher', '/app/attendance'],
    ['teacher', '/app/certificates'],
    ['tcu', '/app/tcu'],
  ] as [Role, string][])(
    'sends a %s who deep-links %s back to the dashboard',
    async (role, path) => {
      useStore.getState().setRole(role)
      renderAppAt(path)
      await waitFor(() => expect(window.location.pathname).toBe('/app'))
    }
  )

  // For a student, Courses IS the browse-and-request view (ADR-0043/0051); the
  // roles that teach or administer keep the catalog list.
  it('opens the browse view on Courses for a student', async () => {
    useStore.getState().setRole('student')
    renderAppAt('/app/courses')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Browse courses' })
    ).toBeInTheDocument()
  })

  it.each(['admin', 'teacher'] as Role[])(
    'opens the course list on Courses for %s',
    async (role) => {
      useStore.getState().setRole(role)
      renderAppAt('/app/courses')
      expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeInTheDocument()
    }
  )

  it("keeps the marking route open to the Course's own teacher", async () => {
    useStore.getState().setRole('teacher')
    const { currentUserId, courses } = useStore.getState()
    const today = clock.today()
    const course = courses.find(
      (c) =>
        c.teacherId === currentUserId &&
        courseDisplayState(c, today) === 'inProgress' &&
        effectiveSessions(c).some((s) => isSessionRecordable(s, today))
    )
    expect(course).toBeDefined()
    if (!course) return
    const session = effectiveSessions(course).find((s) => isSessionRecordable(s, today))
    if (!session) return
    const path = `/app/courses/${course.id}/sessions/${session.date}/mark`

    renderAppAt(path)

    expect(
      await screen.findByRole('heading', { level: 1, name: /mark session attendance/i })
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(path)
  })
})
