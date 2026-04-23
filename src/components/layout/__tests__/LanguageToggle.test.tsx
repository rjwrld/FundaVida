import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { LanguageToggle } from '../LanguageToggle'
import { useStore } from '@/data/store'

function renderToggle(variant: 'header' | 'landing' = 'header') {
  return render(
    <I18nProvider>
      <LanguageToggle variant={variant} />
    </I18nProvider>
  )
}

describe('LanguageToggle', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
    window.localStorage.clear()
  })

  it('renders EN and ES buttons', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'en' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'es' })).toBeInTheDocument()
  })

  it('marks the current locale as pressed', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'en' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'es' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('changes locale and persists to localStorage', async () => {
    renderToggle()
    await userEvent.click(screen.getByRole('button', { name: 'es' }))
    expect(useStore.getState().locale).toBe('es')
    expect(window.localStorage.getItem('fundavida:v1:locale')).toBe('es')
  })
})
