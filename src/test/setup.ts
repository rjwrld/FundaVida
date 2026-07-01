import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// The store seeds via `seedDemo(new Date())` at import time (src/data/store.ts).
// Under a live clock that epoch varies every run, and a cohort whose Term boundary
// falls near it can flip its closed / Certificate state across the runner's timezone
// and timing — a flaky, environment-dependent seed (ADR-0002/0014). Pin `Date` to a
// fixed instant so the Demo Epoch is deterministic while the store module is first
// evaluated (setup runs before any test file's imports). Fake ONLY `Date`, never
// timers, so React Query, debounce, and async waits keep real timers. Real time is
// restored in `beforeAll` — after imports/seeding, before any test body — so the
// freeze's blast radius is exactly the seed phase.
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-06-15T12:00:00Z') })
beforeAll(() => {
  vi.useRealTimers()
})

afterEach(() => {
  cleanup()
})

// matchMedia is not implemented in jsdom — provide a default stub
// Individual tests can override via vi.spyOn(window, 'matchMedia')
if (!window.matchMedia) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {}
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop,
    dispatchEvent: () => false,
    onchange: null,
  })
}

// Radix UI uses pointer capture and scroll APIs not implemented in jsdom
window.HTMLElement.prototype.hasPointerCapture = () => false
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.setPointerCapture = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.releasePointerCapture = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.scrollIntoView = () => {}

// cmdk relies on ResizeObserver; jsdom doesn't implement it
if (!window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  }
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

// framer-motion `whileInView` relies on IntersectionObserver; jsdom doesn't ship it
if (!window.IntersectionObserver) {
  class IntersectionObserverStub {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  }
  window.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver
}
