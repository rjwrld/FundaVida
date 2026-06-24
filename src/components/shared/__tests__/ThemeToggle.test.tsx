import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '@/lib/i18n'
import { ThemeToggle } from '../ThemeToggle'

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
})
