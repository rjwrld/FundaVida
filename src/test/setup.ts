import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

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
