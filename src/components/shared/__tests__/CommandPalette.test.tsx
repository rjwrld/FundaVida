import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
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
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

  it('applies theme when a theme item is selected', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.click(screen.getByRole('button', { name: 'open' }))
    const darkItem = await screen.findByRole('option', { name: /Dark/i })
    await user.click(darkItem)
    expect(localStorage.getItem('fundavida:v1:theme')).toBe('dark')
  })
})
