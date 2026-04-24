import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeBanner } from '../WelcomeBanner'

describe('<WelcomeBanner />', () => {
  it('renders greeting and context copy', () => {
    render(
      <WelcomeBanner
        greeting="Good morning, Ana"
        context="Three certificates are ready to print."
      />
    )
    expect(screen.getByRole('heading', { name: /good morning, ana/i })).toBeInTheDocument()
    expect(screen.getByText(/three certificates/i)).toBeInTheDocument()
  })

  it('renders eyebrow when provided', () => {
    render(<WelcomeBanner eyebrow="Tuesday" greeting="Welcome back" context="Nothing to do." />)
    expect(screen.getByText(/tuesday/i)).toBeInTheDocument()
  })

  it('renders illustration slot content', () => {
    render(
      <WelcomeBanner
        greeting="Hi"
        context="ctx"
        illustration={<svg data-testid="illus" aria-hidden="true" />}
      />
    )
    expect(screen.getByTestId('illus')).toBeInTheDocument()
  })

  it('renders action slot content below context', () => {
    render(
      <WelcomeBanner
        greeting="Hello"
        context="Some context."
        action={<button data-testid="cta">Get started</button>}
      />
    )
    expect(screen.getByTestId('cta')).toBeInTheDocument()
  })
})
