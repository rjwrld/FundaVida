import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import { CertsThisEpoch } from '../CertsThisEpoch'

const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <CertsThisEpoch />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('CertsThisEpoch', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
  })

  it('shows the count of issued certificates and links to the certificates page', async () => {
    const expected = useStore.getState().certificates.length
    expect(expected, 'seed should contain certificates').toBeGreaterThan(0)

    const { container } = renderCard()

    // AnimatedNumber counts up from 0 as the async query resolves; allow it to settle.
    const region = container.querySelector('[data-slot="card"]') as HTMLElement
    expect(
      await within(region).findByText(String(expected), {}, { timeout: 2500 })
    ).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /view all certificates/i })
    expect(link).toHaveAttribute('href', '/app/certificates')
  })
})
