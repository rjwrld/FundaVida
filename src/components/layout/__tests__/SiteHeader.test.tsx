import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { CommandPaletteProvider } from '@/components/shared/CommandPaletteProvider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'
import { useStore } from '@/data/store'
import { clearPersistedRole, clearPersistedState } from '@/data/persistence'

// Reads the palette state the header's triggers are supposed to flip, so the
// spec observes the wiring rather than the dialog itself (CommandPalette has
// its own spec).
function PaletteProbe() {
  const { open } = useCommandPaletteContext()
  return <span data-testid="palette-open">{String(open)}</span>
}

function renderHeader() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app']}>
          <CommandPaletteProvider>
            <SidebarProvider>
              <SiteHeader />
              <PaletteProbe />
            </SidebarProvider>
          </CommandPaletteProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<SiteHeader />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('renders the banner with the sidebar trigger and the breadcrumb slot', () => {
    renderHeader()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle navigation' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })

  it('opens the command palette from the ⌘K trigger', async () => {
    const user = userEvent.setup()
    renderHeader()
    expect(screen.getByTestId('palette-open')).toHaveTextContent('false')
    await user.click(screen.getByRole('button', { name: 'Type a command or search…' }))
    expect(screen.getByTestId('palette-open')).toHaveTextContent('true')
  })

  it('opens the command palette from the compact search button', async () => {
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByTestId('palette-open')).toHaveTextContent('true')
  })

  it('carries the theme and language toggles', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument()
  })
})
