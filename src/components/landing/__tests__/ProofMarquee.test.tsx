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

/** Every rendered screenshot `src` (the marquee duplicates its row, so shots repeat). */
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
    expect(srcs).toContain('/screenshots/calendar.en.png')
    // Single-locale shots (dashboard hero, dark mark-session) are always `.en`.
    expect(srcs).toContain('/screenshots/hero.en.png')
    expect(srcs).toContain('/screenshots/mark-session.en.png')
  })

  it('follows the active locale to the es variant, but keeps single-locale shots on en', () => {
    useStore.getState().setLocale('es')
    renderMarquee()
    const srcs = imageSrcs()
    // Bilingual shots switch to the Spanish capture.
    expect(srcs).toContain('/screenshots/calendar.es.png')
    expect(srcs).toContain('/screenshots/students.es.png')
    // A shot with no es variant does not invent one.
    expect(srcs).toContain('/screenshots/mark-session.en.png')
    expect(srcs).not.toContain('/screenshots/mark-session.es.png')
  })

  it('walks the visitor into the app as admin from the head link', async () => {
    const user = userEvent.setup()
    renderMarquee()
    await user.click(screen.getByRole('button', { name: /open the app/i }))
    expect(useStore.getState().role).toBe('admin')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })
})
