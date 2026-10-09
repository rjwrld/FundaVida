import { describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { fullName } from '@/lib/personName'
import { EnrollmentsListPage } from '@/pages/EnrollmentsListPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <EnrollmentsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

function req<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

const nameOf = (studentId: string) =>
  fullName(
    req(
      useStore.getState().students.find((s) => s.id === studentId),
      'seed: student missing'
    )
  )

/** The table render of the DataTable (each row also renders as a hidden mobile card). */
async function table() {
  return screen.findByRole('table')
}

/** The body rows of the visible table. */
async function bodyRows() {
  return within(await table())
    .getAllByRole('row')
    .slice(1)
}

async function chooseStatus(label: 'Pending' | 'Approved' | 'All') {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Filter by status' }))
  await user.click(screen.getByRole('option', { name: label }))
}

describe('<EnrollmentsListPage /> — the admin request queue (ADR-0051)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('admin')
  })

  it('shows the illustrated empty state when there are no enrollments', async () => {
    useStore.setState({ enrollments: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: /no enrollments yet/i })).toBeInTheDocument()
  })

  it('opens on the pending requests, oldest first, in one flat table', async () => {
    const pending = useStore
      .getState()
      .enrollments.filter((e) => e.status === 'pending')
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))
    expect(pending.length).toBeGreaterThan(0)
    renderPage()

    const t = await table()
    expect(
      within(t)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Student', 'Course', 'Campus', 'Requested', 'Actions'])
    const rows = await bodyRows()
    expect(rows).toHaveLength(Math.min(pending.length, 10))
    const first = req(pending[0], 'seed: no pending enrollment')
    expect(rows[0]).toHaveTextContent(nameOf(first.studentId))
    // No per-Sede or per-Course grouping and no stat tiles: one table is the page.
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.queryByText('Campuses')).not.toBeInTheDocument()
  })

  it('approves a request in place, and the row leaves the pending view', async () => {
    const pending = req(
      useStore.getState().enrollments.find((e) => e.status === 'pending'),
      'seed: no pending enrollment'
    )
    const user = userEvent.setup()
    renderPage()

    const t = await table()
    await user.click(
      within(t).getByRole('button', { name: `Approve ${nameOf(pending.studentId)}'s enrollment` })
    )

    await waitFor(() => {
      expect(useStore.getState().enrollments.find((e) => e.id === pending.id)?.status).toBe(
        'approved'
      )
    })
    await waitFor(() =>
      expect(
        within(t).queryByRole('button', {
          name: `Approve ${nameOf(pending.studentId)}'s enrollment`,
        })
      ).not.toBeInTheDocument()
    )
  })

  it('rejects a request in place', async () => {
    const pending = req(
      useStore.getState().enrollments.find((e) => e.status === 'pending'),
      'seed: no pending enrollment'
    )
    const user = userEvent.setup()
    renderPage()

    const t = await table()
    await user.click(
      within(t).getByRole('button', { name: `Reject ${nameOf(pending.studentId)}'s enrollment` })
    )

    await waitFor(() => {
      expect(useStore.getState().enrollments.find((e) => e.id === pending.id)?.status).toBe(
        'rejected'
      )
    })
  })

  // A closed cohort is terminal (ADR-0024) and the store rejects unenrolling from
  // it, so its approved rows offer no Unenroll; a live cohort's rows still do.
  it('offers Unenroll on an approved row of a live cohort but not of a closed one', async () => {
    const { courses, enrollments } = useStore.getState()
    const statusOf = (courseId: string) => courses.find((c) => c.id === courseId)?.status
    const inClosed = req(
      enrollments.find((e) => e.status === 'approved' && statusOf(e.courseId) === 'closed'),
      'seed: no approved enrollment in a closed course'
    )
    const inLive = req(
      enrollments.find(
        (e) =>
          e.status === 'approved' &&
          statusOf(e.courseId) === 'published' &&
          e.studentId !== inClosed.studentId
      ),
      'seed: no approved enrollment in a live course'
    )
    useStore.setState({ enrollments: [inClosed, inLive] })
    renderPage()

    await screen.findByRole('combobox', { name: 'Filter by status' })
    await chooseStatus('Approved')

    const t = await table()
    expect(
      within(t).getByRole('button', { name: `Delete ${nameOf(inLive.studentId)}` })
    ).toBeInTheDocument()
    expect(
      within(t).queryByRole('button', { name: `Delete ${nameOf(inClosed.studentId)}` })
    ).not.toBeInTheDocument()
  })

  it('shows every status, rejected included, under All', async () => {
    const pending = req(
      useStore.getState().enrollments.find((e) => e.status === 'pending'),
      'seed: no pending enrollment'
    )
    useStore.getState().rejectEnrollment(pending.id)
    useStore.setState({
      enrollments: useStore.getState().enrollments.filter((e) => e.id === pending.id),
    })
    renderPage()

    // Nothing pending: the default view says the queue is clear.
    await screen.findByText('No enrollment requests waiting.')
    await chooseStatus('All')

    const t = await table()
    expect(within(t).getByText('Rejected')).toBeInTheDocument()
  })

  it('pages the approved list through one pager (ADR-0026)', async () => {
    const approved = useStore.getState().enrollments.filter((e) => e.status === 'approved')
    expect(approved.length).toBeGreaterThan(10)
    renderPage()

    await screen.findByRole('combobox', { name: 'Filter by status' })
    await chooseStatus('Approved')

    expect(await bodyRows()).toHaveLength(10)
    expect(screen.getAllByText(`Page 1 of ${Math.ceil(approved.length / 10)}`)).toHaveLength(1)
  })
})
