import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatedNumber } from '../AnimatedNumber'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

describe('<AnimatedNumber />', () => {
  it('renders the final value when reduced motion is on', () => {
    render(<AnimatedNumber value={1234} />)
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('applies a custom formatter', () => {
    render(<AnimatedNumber value={0.42} format={(n) => `${(n * 100).toFixed(0)}%`} />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('exposes the raw value via aria-label', () => {
    render(<AnimatedNumber value={99} aria-label="score" />)
    expect(screen.getByLabelText('score')).toBeInTheDocument()
  })
})
