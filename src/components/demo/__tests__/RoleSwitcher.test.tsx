import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'
import { useStore } from '@/data/store'
import { clearPersistedState } from '@/data/persistence'

describe('<RoleSwitcher />', () => {
  beforeEach(() => {
    clearPersistedState()
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

  it('opens the dropdown and swaps roles on selection', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleSwitcher />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /role: admin/i }))
    await user.click(screen.getByRole('menuitem', { name: /student/i }))
    expect(useStore.getState().role).toBe('student')
  })
})
