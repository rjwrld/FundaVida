import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('<AppSidebar />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('renders nothing when no role is selected', () => {
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSidebar />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows dashboard, students, courses, certificates for admin', () => {
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSidebar />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Certificates' })).toBeInTheDocument()
  })

  it('hides students for student role', () => {
    useStore.getState().setRole('student')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSidebar />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Certificates' })).toBeInTheDocument()
  })
})
