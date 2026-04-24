import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LogoMark } from '../LogoMark'

describe('<LogoMark />', () => {
  it('renders an img with /favicon.svg for variant="icon"', () => {
    render(<LogoMark variant="icon" />)
    const img = screen.getByRole('img', { name: /fundavida/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/favicon.svg')
  })

  it('renders an img with /logo.svg for variant="full"', () => {
    render(<LogoMark variant="full" />)
    const img = screen.getByRole('img', { name: /fundavida/i })
    expect(img).toHaveAttribute('src', '/logo.svg')
  })

  it('renders an img with /logo.svg for variant="wordmark"', () => {
    render(<LogoMark variant="wordmark" />)
    const img = screen.getByRole('img', { name: /fundavida/i })
    expect(img).toHaveAttribute('src', '/logo.svg')
  })

  it('defaults to variant="full" when no variant is provided', () => {
    render(<LogoMark />)
    const img = screen.getByRole('img', { name: /fundavida/i })
    expect(img).toHaveAttribute('src', '/logo.svg')
  })
})
