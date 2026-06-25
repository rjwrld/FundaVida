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

  it('renders an img with /logo-mark.svg for variant="mark"', () => {
    render(<LogoMark variant="mark" />)
    const img = screen.getByRole('img', { name: /fundavida/i })
    expect(img).toHaveAttribute('src', '/logo-mark.svg')
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

  it('renders a flat-tinted mask instead of a colored img for tone="muted"', () => {
    const { container } = render(<LogoMark variant="mark" tone="muted" alt="" />)
    expect(container.querySelector('img')).toBeNull()
    const mark = container.firstElementChild as HTMLElement
    expect(mark.tagName).toBe('SPAN')
    expect(mark.style.maskImage).toContain('/logo-mark.svg')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the tinted mark labelled when alt is provided', () => {
    render(<LogoMark variant="mark" tone="muted" alt="FundaVida" />)
    const mark = screen.getByRole('img', { name: /fundavida/i })
    expect(mark.tagName).toBe('SPAN')
    expect(mark).not.toHaveAttribute('aria-hidden')
  })
})
