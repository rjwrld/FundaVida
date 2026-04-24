import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '../StatCard'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

describe('<StatCard />', () => {
  it('renders label and numeric value', () => {
    render(<StatCard label="Active Students" value={42} />)
    expect(screen.getByText('Active Students')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows a delta cluster when provided', () => {
    render(
      <StatCard label="Completion" value={80} delta={{ value: 0.12, label: 'vs last month' }} />
    )
    expect(screen.getByText(/vs last month/i)).toBeInTheDocument()
    expect(screen.getByText(/12%/)).toBeInTheDocument()
  })

  it('supports custom formatting', () => {
    render(<StatCard label="Rate" value={0.87} format={(n) => `${(n * 100).toFixed(0)}%`} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('applies the flame variant class', () => {
    const { container } = render(
      <StatCard label="Hope" value={10} variant="flame" data-testid="card" />
    )
    expect(container.firstChild).toHaveClass('from-flame-yellow-50')
  })

  it('renders a sparkline svg polyline when sparkline data is provided', () => {
    const { container } = render(<StatCard label="Trend" value={5} sparkline={[1, 2, 3, 4, 5]} />)
    expect(container.querySelector('svg polyline')).not.toBeNull()
  })
})
