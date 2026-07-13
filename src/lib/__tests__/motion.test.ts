import { describe, it, expect } from 'vitest'
import { chartDrawIn } from '@/lib/motion'

describe('chartDrawIn', () => {
  it('animates inside the phase-6a 150–250ms band when motion is allowed', () => {
    expect(chartDrawIn(false)).toEqual({
      isAnimationActive: true,
      animationDuration: 250,
      animationEasing: 'ease-out',
    })
  })

  it('disables the draw-in under prefers-reduced-motion', () => {
    expect(chartDrawIn(true).isAnimationActive).toBe(false)
  })

  it("treats framer's initial null read as motion allowed", () => {
    // useReducedMotion() returns null before the media query resolves; the
    // draw-in must not flash on/off, so null means "no preference".
    expect(chartDrawIn(null).isAnimationActive).toBe(true)
  })
})
