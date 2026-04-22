import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleRequired } from '@/components/demo/RoleRequired'
import { useStore } from '@/data/store'
import { clearPersistedRole, clearPersistedState } from '@/data/persistence'

describe('<RoleRequired />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    useStore.getState().resetDemo()
  })

  it('redirects to / when no role is selected', () => {
    render(
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<div>landing</div>} />
          <Route element={<RoleRequired />}>
            <Route path="/app" element={<div>protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('landing')).toBeInTheDocument()
  })

  it('renders the protected outlet when a role is set', () => {
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<div>landing</div>} />
          <Route element={<RoleRequired />}>
            <Route path="/app" element={<div>protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
