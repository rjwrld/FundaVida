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

  // ui/toggle-group with `type="single"` is a Radix radiogroup: the locales are
  // `radio`s carrying `aria-checked`, not `aria-pressed` buttons. That is the
  // correct ARIA for an exclusive choice, and it is what the port buys.
  it('renders EN and ES as radios in a labelled radiogroup', () => {
    renderToggle()
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'en' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'es' })).toBeInTheDocument()
  })

  it('marks the current locale as checked', () => {
    renderToggle()
    expect(screen.getByRole('radio', { name: 'en' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'es' })).toHaveAttribute('aria-checked', 'false')
  })

  it('changes locale and persists to localStorage', async () => {
    renderToggle()
    await userEvent.click(screen.getByRole('radio', { name: 'es' }))
    expect(useStore.getState().locale).toBe('es')
    expect(window.localStorage.getItem('fundavida:v2:locale')).toBe('es')
  })

  it('keeps the active locale selected when it is re-clicked (no deselect)', async () => {
    renderToggle()
    await userEvent.click(screen.getByRole('radio', { name: 'en' }))
    expect(useStore.getState().locale).toBe('en')
    expect(screen.getByRole('radio', { name: 'en' })).toHaveAttribute('aria-checked', 'true')
  })
})
