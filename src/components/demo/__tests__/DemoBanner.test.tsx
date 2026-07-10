import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/lib/i18n'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { DemoBadge } from '@/components/demo/DemoBadge'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'

// The banner (strip) and badge (header chip) share dismissed state, so the
// integrated behaviour is tested with both mounted together — mirroring the
// real layout where the strip sits above the header and the chip inside it.
function renderBanner() {
  return render(
    <I18nProvider>
      <TooltipProvider>
        <DemoBanner />
        <DemoBadge />
      </TooltipProvider>
    </I18nProvider>
  )
}

describe('<DemoBanner />', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useStore.getState().setLocale('en')
    // Pin the frozen Demo Epoch so the banner's date is deterministic: noon local, 27 Jun 2026.
    setDemoEpoch(new Date(2026, 5, 27, 12, 0, 0))
  })

  it('shows the frozen snapshot date in the active locale', async () => {
    renderBanner()
    expect(await screen.findByText(/sample data frozen at Jun 27, 2026/i)).toBeInTheDocument()
  })

  it('collapses to a persistent badge when dismissed', async () => {
    const user = userEvent.setup()
    renderBanner()
    await screen.findByText(/sample data frozen at Jun 27, 2026/i)

    await user.click(screen.getByRole('button', { name: /dismiss/i }))

    // The full banner copy is gone…
    expect(screen.queryByText(/sample data frozen at/i)).not.toBeInTheDocument()
    // …replaced by a small, still-present badge (now in the header).
    expect(screen.getByRole('button', { name: /demo snapshot/i })).toBeInTheDocument()
  })

  it('re-opens the full banner from the badge', async () => {
    const user = userEvent.setup()
    renderBanner()
    await screen.findByText(/sample data frozen at Jun 27, 2026/i)

    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await user.click(screen.getByRole('button', { name: /demo snapshot/i }))

    expect(await screen.findByText(/sample data frozen at Jun 27, 2026/i)).toBeInTheDocument()
  })

  it('renders the Spanish copy when the locale is es', async () => {
    useStore.getState().setLocale('es')
    renderBanner()
    expect(await screen.findByText(/datos de ejemplo congelados al/i)).toBeInTheDocument()
  })

  it('honors the dismissed state across a reload (remount)', async () => {
    const user = userEvent.setup()
    const first = renderBanner()
    await screen.findByText(/sample data frozen at Jun 27, 2026/i)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))

    // Simulate a page reload: tear the tree down and mount a fresh instance.
    first.unmount()
    renderBanner()

    // The badge — not the full banner — comes back from the persisted flag.
    expect(screen.getByRole('button', { name: /demo snapshot/i })).toBeInTheDocument()
    expect(screen.queryByText(/sample data frozen at/i)).not.toBeInTheDocument()
  })
})
