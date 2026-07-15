import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { FinalCTA } from '../FinalCTA'
import { useStore } from '@/data/store'
import { fullName } from '@/lib/personName'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderFinalCTA() {
  return render(
    <I18nProvider>
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <FinalCTA />
        <LocationDisplay />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('FinalCTA', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('renders the admin fast-path CTA and navigates to /app', async () => {
    const user = userEvent.setup()
    renderFinalCTA()
    const cta = screen.getByRole('button', { name: 'Enter as admin' })
    await user.click(cta)
    expect(useStore.getState().role).toBe('admin')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })

  it('reprises the persona badges and enters as the picked role', async () => {
    const user = userEvent.setup()
    renderFinalCTA()
    const { students } = useStore.getState()
    const student = students.find((s) => s.id === 'stu-1')
    if (!student) throw new Error('seed should carry the stu-1 persona')

    await user.click(screen.getByRole('button', { name: `Student ${fullName(student)}` }))

    expect(useStore.getState().role).toBe('student')
    expect(useStore.getState().currentUserId).toBe('stu-1')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })
})
