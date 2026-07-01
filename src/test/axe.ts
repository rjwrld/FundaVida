import { expect } from 'vitest'
import { configureAxe, toHaveNoViolations } from 'jest-axe'

// Wire jest-axe's matcher into vitest's `expect`. Importing this module for its
// side effect is enough; tests then call `expect(await axe(node)).toHaveNoViolations()`.
expect.extend(toHaveNoViolations)

/**
 * Pre-configured axe runner for component-in-isolation tests under jsdom.
 *
 * - `color-contrast` needs real layout and a canvas, neither of which jsdom
 *   provides, so it only ever returns "incomplete" and logs noisy canvas warnings.
 * - `region` (landmark containment) is a page-structure concern; a single
 *   component rendered without its `<main>`/nav shell always trips it, so it is
 *   noise here — page-level landmark checks belong in e2e, not component smoke tests.
 */
export const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- must match vitest's own `Assertion<T = any>` generic default
  interface Assertion<T = any> {
    toHaveNoViolations(): T
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
