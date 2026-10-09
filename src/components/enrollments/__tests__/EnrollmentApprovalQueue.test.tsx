import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <EnrollmentApprovalQueue />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** Clear every pending request, then re-pend `n` approved ones on open cohorts. */
function pendExactly(n: number) {
  const { enrollments, courses } = useStore.getState()
  const open = new Set(courses.filter((c) => c.status === 'published').map((c) => c.id))
  const targets = new Set(
    enrollments
      .filter((e) => e.status === 'approved' && open.has(e.courseId))
      .slice(0, n)
      .map((e) => e.id)
  )
  if (targets.size !== n) throw new Error(`seed needs ${n} approved enrollments on open cohorts`)
  useStore.setState({
    enrollments: enrollments.map((e) =>
      targets.has(e.id)
        ? { ...e, status: 'pending' as const }
        : e.status === 'pending'
          ? { ...e, status: 'rejected' as const }
          : e
    ),
  })
}

describe('<EnrollmentApprovalQueue /> (admin: every pending request)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('is a titled card counting the pending requests', async () => {
    pendExactly(2)
    renderQueue()

    const card = await screen.findByRole('region', { name: 'Enrollment requests' })
    const heading = within(card).getByRole('heading', { level: 3, name: 'Enrollment requests' })
    expect(heading.parentElement).toHaveTextContent('2')
    expect(within(within(card).getByRole('table')).getAllByRole('row')).toHaveLength(3)
  })

  it('drops a rejected request from the queue', async () => {
    const user = userEvent.setup()
    pendExactly(2)
    renderQueue()

    const table = await screen.findByRole('table')
    const firstRow = within(table).getAllByRole('row')[1]
    if (!firstRow) throw new Error('queue should have a row')
    await user.click(within(firstRow).getByRole('button', { name: /^reject/i }))

    await expect.poll(() => within(table).getAllByRole('row').length).toBe(2)
  })

  it('stays on screen with a compact empty state when nothing is pending', async () => {
    pendExactly(0)
    renderQueue()

    const card = await screen.findByRole('region', { name: 'Enrollment requests' })
    expect(within(card).getByText('No enrollment requests waiting.')).toBeInTheDocument()
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()
  })
})
