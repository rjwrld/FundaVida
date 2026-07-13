import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireConfetti } from '../confetti'

// A 2D-context stub covering exactly the calls the confetti loop makes; jsdom
// has no canvas implementation, so the module's guard on a null context is also
// exercised by returning null from getContext.
function stubContext() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('fireConfetti', () => {
  let rafQueue: FrameRequestCallback[]
  let now: number

  /** Run one animation frame at `now + ms`, like the browser would. */
  function step(ms: number) {
    now += ms
    const callbacks = rafQueue
    rafQueue = []
    for (const cb of callbacks) cb(now)
  }

  beforeEach(() => {
    rafQueue = []
    now = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      stubContext() as ReturnType<HTMLCanvasElement['getContext']>
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.querySelectorAll('canvas').forEach((c) => c.remove())
  })

  it('mounts a decorative, click-through overlay canvas', () => {
    fireConfetti()

    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('confetti canvas was not mounted')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas.style.pointerEvents).toBe('none')
    expect(canvas.style.position).toBe('fixed')
  })

  it('removes the canvas once the burst has played out', () => {
    fireConfetti()
    expect(document.querySelector('canvas')).not.toBeNull()

    // First frame establishes the clock; then advance well past the duration.
    step(16)
    step(5000)

    expect(document.querySelector('canvas')).toBeNull()
    expect(rafQueue).toHaveLength(0)
  })

  it('keeps animating on intermediate frames', () => {
    fireConfetti()
    step(16)
    step(200)
    expect(document.querySelector('canvas')).not.toBeNull()
    expect(rafQueue.length).toBeGreaterThan(0)
  })

  it('is a no-op under prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => false,
      onchange: null,
    } as unknown as MediaQueryList)

    fireConfetti()

    expect(document.querySelector('canvas')).toBeNull()
  })

  it('is a no-op when the canvas cannot provide a 2D context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    fireConfetti()

    expect(document.querySelector('canvas')).toBeNull()
  })
})
