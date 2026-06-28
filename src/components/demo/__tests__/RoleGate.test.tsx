import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGate } from '@/components/demo/RoleGate'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('<RoleGate />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('allows a teacher to view the students resource', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter
        initialEntries={['/students']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="students" />}>
            <Route path="/students" element={<div>students list</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('students list')).toBeInTheDocument()
  })

  it('redirects a student away from the students resource', () => {
    useStore.getState().setRole('student')
    render(
      <MemoryRouter
        initialEntries={['/students']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="students" />}>
            <Route path="/students" element={<div>students list</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.queryByText('students list')).not.toBeInTheDocument()
  })

  it('allows an admin to view the bulkEmail resource', () => {
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter
        initialEntries={['/bulk-email']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="bulkEmail" />}>
            <Route path="/bulk-email" element={<div>bulk email</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('bulk email')).toBeInTheDocument()
  })

  it('denies a teacher from viewing the bulkEmail resource', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter
        initialEntries={['/bulk-email']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="bulkEmail" />}>
            <Route path="/bulk-email" element={<div>bulk email</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.queryByText('bulk email')).not.toBeInTheDocument()
  })

  it('allows teacher to view the courses resource', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter
        initialEntries={['/courses']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="courses" />}>
            <Route path="/courses" element={<div>courses list</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('courses list')).toBeInTheDocument()
  })

  it('allows student to view the courses resource', () => {
    useStore.getState().setRole('student')
    render(
      <MemoryRouter
        initialEntries={['/courses']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="courses" />}>
            <Route path="/courses" element={<div>courses list</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('courses list')).toBeInTheDocument()
  })

  it('allows a teacher through a create-gated courses route (ADR-0016)', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter
        initialEntries={['/courses/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="courses" action="create" />}>
            <Route path="/courses/new" element={<div>course form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('course form')).toBeInTheDocument()
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument()
  })

  it('allows an admin through a create-gated courses route', () => {
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter
        initialEntries={['/courses/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="courses" action="create" />}>
            <Route path="/courses/new" element={<div>course form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('course form')).toBeInTheDocument()
  })

  it('redirects a teacher away from an edit-gated students route', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter
        initialEntries={['/students/stu-1/edit']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app" element={<div>dashboard</div>} />
          <Route element={<RoleGate resource="students" action="edit" />}>
            <Route path="/students/:id/edit" element={<div>student form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.queryByText('student form')).not.toBeInTheDocument()
  })
})
