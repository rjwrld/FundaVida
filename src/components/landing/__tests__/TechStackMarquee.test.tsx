import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TechStackMarquee } from '../TechStackMarquee'

describe('TechStackMarquee', () => {
  it('renders multiple instances of each tech badge across the two rails', () => {
    render(<TechStackMarquee />)
    const reactBadges = screen.getAllByText('React 18')
    expect(reactBadges.length).toBeGreaterThanOrEqual(2)
  })

  it('renders Playwright and Vercel badges', () => {
    render(<TechStackMarquee />)
    expect(screen.getAllByText('Playwright').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Vercel').length).toBeGreaterThanOrEqual(2)
  })
})
