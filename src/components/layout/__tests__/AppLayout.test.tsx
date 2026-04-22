import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

describe('<AppLayout />', () => {
  it('renders the header, sidebar, and outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Hello from outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('FundaVida')).toBeInTheDocument()
    expect(screen.getByLabelText('Sections')).toBeInTheDocument()
    expect(screen.getByText('Hello from outlet')).toBeInTheDocument()
  })
})
