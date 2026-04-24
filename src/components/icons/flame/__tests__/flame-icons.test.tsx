import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import {
  FlameCelebration,
  FlameCertificate,
  FlameEmpty,
  FlameHope,
  FlameMilestone,
  FlameWelcome,
} from '..'

const icons = [
  ['FlameHope', FlameHope],
  ['FlameCertificate', FlameCertificate],
  ['FlameMilestone', FlameMilestone],
  ['FlameWelcome', FlameWelcome],
  ['FlameEmpty', FlameEmpty],
  ['FlameCelebration', FlameCelebration],
] as const

describe('flame icon family', () => {
  it.each(icons)('renders an aria-hidden svg for %s', (_name, Icon) => {
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('forwards className to the svg', () => {
    const { container } = render(<FlameHope className="size-6 text-brand-green-500" />)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('size-6')
  })
})
