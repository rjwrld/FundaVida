import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/lib/i18n'
import { ThemeToggle } from '../ThemeToggle'

type StartViewTransition = (cb: () => void) => { ready: Promise<void> }

function renderWithI18n() {
  return render(
    <I18nProvider>
      <ThemeToggle />
    </I18nProvider>
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders an accessible toggle button', () => {
    renderWithI18n()
    expect(screen.getByRole('button', { name: /toggle theme|cambiar tema/i })).toBeInTheDocument()
  })

  it('opens the menu and applies dark theme', async () => {
    const user = userEvent.setup()
    renderWithI18n()
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText(/^(dark|oscuro)$/i))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('fundavida:v1:theme')).toBe('dark')
  })

  describe('circular wipe (ADR-0047 phase 6b, progressive enhancement)', () => {
    afterEach(() => {
      delete (document as { startViewTransition?: StartViewTransition }).startViewTransition
      delete (document.documentElement as { animate?: unknown }).animate
    })

    function installViewTransition() {
      const start = vi.fn((cb: () => void) => {
        cb()
        return { ready: Promise.resolve() }
      })
      ;(document as { startViewTransition?: StartViewTransition }).startViewTransition = start
      ;(document.documentElement as unknown as { animate: () => void }).animate = vi.fn()
      return start
    }

    it('routes a real light→dark flip through a view transition', async () => {
      const start = installViewTransition()
      const user = userEvent.setup()
      renderWithI18n()

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText(/^(dark|oscuro)$/i))

      expect(start).toHaveBeenCalledTimes(1)
      // The class flipped inside the transition callback (start's mock runs it).
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem('fundavida:v1:theme')).toBe('dark')
    })

    it('skips the transition when the resolved theme does not change', async () => {
      const start = installViewTransition()
      const user = userEvent.setup()
      renderWithI18n()

      // Already light (beforeEach removes `dark`; the matchMedia stub resolves
      // system → light), so choosing "system" changes nothing on screen.
      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText(/^(system|sistema)$/i))

      expect(start).not.toHaveBeenCalled()
      expect(localStorage.getItem('fundavida:v1:theme')).toBe('system')
    })
  })
})
