import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { CommandPalette } from '../CommandPalette'
import { CommandPaletteProvider } from '../CommandPaletteProvider'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function TriggerButton() {
  const { setOpen } = useCommandPaletteContext()
  return (
    <button type="button" onClick={() => setOpen(true)}>
      open
    </button>
  )
}

function renderPalette() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <CommandPaletteProvider>
          <TriggerButton />
          <CommandPalette />
        </CommandPaletteProvider>
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<CommandPalette />', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    localStorage.clear()
    useStore.getState().setRole('admin')
  })

  it('opens on Cmd+K and shows Navigation and Theme groups', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(await screen.findByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('dispatches navigate when a navigation item is selected', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole('button', { name: 'open' }))
    const dashboardItem = await screen.findByRole('option', { name: /Dashboard/i })
    await user.click(dashboardItem)
    expect(navigateMock).toHaveBeenCalledWith('/app')
  })

  it('keeps the Dashboard reachable by its "home" keyword alias', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole('button', { name: 'open' }))
    await user.type(await screen.findByRole('combobox'), 'home')
    const dashboardItem = await screen.findByRole('option', { name: /Dashboard/i })
    await user.click(dashboardItem)
    expect(navigateMock).toHaveBeenCalledWith('/app')
  })

  it('applies theme when a theme item is selected', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole('button', { name: 'open' }))
    const darkItem = await screen.findByRole('option', { name: /Dark/i })
    await user.click(darkItem)
    expect(localStorage.getItem('fundavida:v1:theme')).toBe('dark')
  })

  // The palette derives its destinations from the matrix (ADR-0035), so it offers
  // exactly the routes the role can reach — never one RoleGate would bounce.
  it('offers an admin every navigable destination', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole('button', { name: 'open' }))
    await screen.findByRole('option', { name: /Dashboard/i })
    for (const name of [/Courses/i, /Students/i, /Certificates/i, /Bulk Email/i, /Audit Log/i]) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument()
    }
  })

  it('offers a tcu volunteer only their reachable destinations', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('tcu')
    renderPalette()
    await user.click(screen.getByRole('button', { name: 'open' }))
    // Reachable for tcu: Dashboard, Calendar, TCU.
    await screen.findByRole('option', { name: /Dashboard/i })
    expect(screen.getByRole('option', { name: /Calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^TCU/i })).toBeInTheDocument()
    // Gated destinations must not appear (they'd bounce off RoleGate).
    for (const name of [/Students/i, /Courses/i, /Certificates/i, /Programs/i, /Bulk Email/i]) {
      expect(screen.queryByRole('option', { name })).not.toBeInTheDocument()
    }
  })
})
