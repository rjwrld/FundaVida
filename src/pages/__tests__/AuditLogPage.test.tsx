import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { AuditLogPage } from '@/pages/AuditLogPage'
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
          <AuditLogPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<AuditLogPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('windows the scoped audit entries to the default page size', async () => {
    const total = useStore.getState().auditLog.length
    expect(total).toBeGreaterThan(10) // guard: the seed must exceed one page
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(10)
    expect(screen.getByText(`Page 1 of ${Math.ceil(total / 10)}`)).toBeInTheDocument()
  })
})
