import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { ProofMarquee } from '../ProofMarquee'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderMarquee() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <ProofMarquee />
        <LocationDisplay />
      </MemoryRouter>
    </I18nProvider>
  )
}

/** Every screenshot `src` exposed to assistive tech (the loop's copy is hidden). */
function imageSrcs() {
  return screen.getAllByRole('img').map((img) => img.getAttribute('src'))
}

describe('ProofMarquee', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('resolves the English screenshot variants under the en locale', () => {
    renderMarquee()
    const srcs = imageSrcs()
    // Bilingual shot follows the active locale.
    expect(srcs).toContain('/screenshots/calendar.en.thumb.webp')
    // Single-locale shots (dashboard hero, dark mark-session) are always `.en`.
    expect(srcs).toContain('/screenshots/hero.en.thumb.webp')
    expect(srcs).toContain('/screenshots/mark-session.en.thumb.webp')
  })

  it('follows the active locale to the es variant, but keeps single-locale shots on en', () => {
    useStore.getState().setLocale('es')
    renderMarquee()
    const srcs = imageSrcs()
    // Bilingual shots switch to the Spanish capture.
    expect(srcs).toContain('/screenshots/calendar.es.thumb.webp')
    expect(srcs).toContain('/screenshots/students.es.thumb.webp')
    // A shot with no es variant does not invent one.
    expect(srcs).toContain('/screenshots/mark-session.en.thumb.webp')
    expect(srcs).not.toContain('/screenshots/mark-session.es.thumb.webp')
  })

  it('walks the visitor into the app as admin from the head link', async () => {
    const user = userEvent.setup()
    renderMarquee()
    await user.click(screen.getByRole('button', { name: /open the app/i }))
    expect(useStore.getState().role).toBe('admin')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })

  it('announces each screenshot once — the loop copy is hidden from assistive tech', () => {
    renderMarquee()
    expect(screen.getAllByRole('img')).toHaveLength(6)
  })

  it('offers a pause control for the moving row (WCAG 2.2.2)', async () => {
    const user = userEvent.setup()
    renderMarquee()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })
})
