import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('<RoleSwitcher />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('shows a prompt when no role is selected', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleSwitcher />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /choose role/i })).toBeInTheDocument()
  })

  it('shows the current role label when one is selected', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleSwitcher />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /role: teacher/i })).toBeInTheDocument()
  })

  it('opens the dropdown, swaps roles, and navigates to /app', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')

    function LocationDisplay() {
      const location = useLocation()
      return <div data-testid="location">{location.pathname}</div>
    }

    render(
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <RoleSwitcher />
        <LocationDisplay />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /role: admin/i }))
    await user.click(screen.getByRole('menuitem', { name: /student/i }))
    expect(useStore.getState().role).toBe('student')
    expect(screen.getByTestId('location')).toHaveTextContent('/app')
  })
})
