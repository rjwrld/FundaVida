import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AnimatedNumber } from '../AnimatedNumber'

const reducedMotion = vi.hoisted(() => ({ value: true }))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => reducedMotion.value }
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

  describe('mid-tween', () => {
    afterEach(() => {
      reducedMotion.value = true
      vi.useRealTimers()
    })

    it('never shows a fractional frame for an integer count', () => {
      reducedMotion.value = false
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
      const { container, rerender } = render(<AnimatedNumber value={0} />)

      rerender(<AnimatedNumber value={50} />)
      const frames: string[] = []
      for (let i = 0; i < 12; i++) {
        act(() => {
          vi.advanceTimersByTime(37)
        })
        frames.push(container.textContent ?? '')
      }

      // A raw tween frame read "35.613"; every frame must be a whole number.
      expect(frames.some((f) => f !== '0' && f !== '50')).toBe(true)
      for (const frame of frames) expect(frame).toMatch(/^\d+$/)
    })
  })
})
