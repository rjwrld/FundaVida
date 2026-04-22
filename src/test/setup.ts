import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Radix UI uses pointer capture and scroll APIs not implemented in jsdom
window.HTMLElement.prototype.hasPointerCapture = () => false
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.setPointerCapture = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.releasePointerCapture = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.scrollIntoView = () => {}
