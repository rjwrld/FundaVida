import { afterEach, describe, expect, it, vi } from 'vitest'
import { themeWipe } from '../themeWipe'

type StartViewTransition = (cb: () => void) => { ready: Promise<void> }

// jsdom ships neither the View Transitions API nor Element.animate — both are
// installed per test and removed here.
afterEach(() => {
  delete (document as { startViewTransition?: StartViewTransition }).startViewTransition
  delete (document.documentElement as { animate?: unknown }).animate
  vi.restoreAllMocks()
})

function installViewTransition() {
  const start = vi.fn((cb: () => void) => {
    cb()
    return { ready: Promise.resolve() }
  })
  ;(document as { startViewTransition?: StartViewTransition }).startViewTransition = start
  const animate = vi.fn()
  ;(document.documentElement as unknown as { animate: typeof animate }).animate = animate
  return { start, animate }
}

function reduceMotion() {
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
}

describe('themeWipe', () => {
  it('just applies when the View Transitions API is missing (jsdom, Firefox)', () => {
    const apply = vi.fn()
    themeWipe(apply)
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('applies inside the transition callback and animates a circle from the origin', async () => {
    const { start, animate } = installViewTransition()
    const apply = vi.fn()

    themeWipe(apply, { x: 10, y: 20 })

    expect(start).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledTimes(1) // ran inside the callback
    await Promise.resolve() // let transition.ready settle

    expect(animate).toHaveBeenCalledTimes(1)
    const [keyframes, options] = animate.mock.calls[0] as [
      { clipPath: string[] },
      { pseudoElement: string },
    ]
    expect(keyframes.clipPath[0]).toBe('circle(0px at 10px 20px)')
    expect(keyframes.clipPath[1]).toMatch(/^circle\(\d+(\.\d+)?px at 10px 20px\)$/)
    expect(options.pseudoElement).toBe('::view-transition-new(root)')
  })

  it('skips the transition under prefers-reduced-motion, but still applies', () => {
    const { start } = installViewTransition()
    reduceMotion()
    const apply = vi.fn()

    themeWipe(apply)

    expect(apply).toHaveBeenCalledTimes(1)
    expect(start).not.toHaveBeenCalled()
  })

  it('survives the browser skipping the transition (ready rejects)', async () => {
    const start = vi.fn((cb: () => void) => {
      cb()
      return { ready: Promise.reject(new Error('skipped')) }
    })
    ;(document as { startViewTransition?: StartViewTransition }).startViewTransition = start
    const apply = vi.fn()

    themeWipe(apply)
    await Promise.resolve()
    await Promise.resolve()

    expect(apply).toHaveBeenCalledTimes(1) // no unhandled rejection, theme applied
  })
})
