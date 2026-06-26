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

  it('announces an increase to assistive tech for a positive delta', () => {
    render(
      <StatCard
        label="Completion"
        value={80}
        delta={{
          value: 0.12,
          label: 'vs last month',
          trend: { up: 'Increased', down: 'Decreased' },
        }}
      />
    )
    expect(screen.getByText(/increased/i)).toBeInTheDocument()
  })

  it('announces a decrease to assistive tech for a negative delta', () => {
    render(
      <StatCard
        label="TCU hours"
        value={154}
        delta={{
          value: -0.02,
          label: 'vs last month',
          trend: { up: 'Increased', down: 'Decreased' },
        }}
      />
    )
    expect(screen.getByText(/decreased/i)).toBeInTheDocument()
    expect(screen.queryByText(/increased/i)).not.toBeInTheDocument()
  })

  it('shows a neutral no-change cue for a zero delta instead of a false decrease', () => {
    render(
      <StatCard
        label="Active courses"
        value={8}
        delta={{
          value: 0,
          label: 'vs last month',
          trend: { up: 'Increased', down: 'Decreased', flat: 'No change' },
        }}
      />
    )
    expect(screen.getByText(/0%/)).toBeInTheDocument()
    expect(screen.getByText(/no change/i)).toBeInTheDocument()
    expect(screen.queryByText(/increased/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/decreased/i)).not.toBeInTheDocument()
  })

  it('treats a delta that rounds to 0% as flat, matching the displayed number', () => {
    render(
      <StatCard
        label="Students"
        value={24}
        delta={{
          value: 0.003,
          label: 'vs last month',
          trend: { up: 'Increased', down: 'Decreased', flat: 'No change' },
        }}
      />
    )
    expect(screen.getByText(/0%/)).toBeInTheDocument()
    expect(screen.queryByText(/increased/i)).not.toBeInTheDocument()
  })
})
