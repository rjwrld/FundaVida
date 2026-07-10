import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANTS = ['success', 'warning', 'destructive', 'info', 'neutral'] as const
const PLAIN_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'link'] as const

function dotOf(container: HTMLElement) {
  return container.querySelector('[data-slot="badge-dot"]')
}

describe('<Badge />', () => {
  it('renders its children', () => {
    render(<Badge>Approved</Badge>)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it.each(STATUS_VARIANTS)('renders a decorative status dot for the %s variant', (variant) => {
    const { container } = render(<Badge variant={variant}>Status</Badge>)
    const dot = dotOf(container)
    expect(dot).toBeInTheDocument()
    // The dot carries the hue, so it must stay out of the accessibility tree.
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(PLAIN_VARIANTS)('renders no status dot for the %s variant', (variant) => {
    const { container } = render(<Badge variant={variant}>Label</Badge>)
    expect(dotOf(container)).not.toBeInTheDocument()
  })

  it('tints the dot, never the label, so the text keeps foreground contrast', () => {
    const { container } = render(<Badge variant="success">Passing</Badge>)
    expect(dotOf(container)).toHaveClass('bg-success')
    expect(screen.getByText('Passing').closest('[data-slot="badge"]')).toHaveClass(
      'text-foreground'
    )
  })

  // `warning` has no hue of its own (ADR-0047 retired `--warning`), so the dot is
  // the only thing keeping an actionable "Pending" apart from an inert "Withdrawn".
  it('gives the actionable warning state a stronger dot than the quiet states', () => {
    const warning = render(<Badge variant="warning">Pending</Badge>)
    const neutral = render(<Badge variant="neutral">Withdrawn</Badge>)
    expect(dotOf(warning.container)).toHaveClass('bg-foreground')
    expect(dotOf(neutral.container)).toHaveClass('bg-muted-foreground')
    expect(dotOf(warning.container)?.className).not.toEqual(dotOf(neutral.container)?.className)
  })

  it('renders status variants as outline pills rather than filled chips', () => {
    const { container } = render(<Badge variant="destructive">Absent</Badge>)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('border-border', 'bg-transparent')
    expect(badge).not.toHaveClass('bg-destructive')
    expect(dotOf(container)).toHaveClass('bg-destructive')
  })

  it('keeps the filled look for the default variant', () => {
    const { container } = render(<Badge>New</Badge>)
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('bg-primary')
  })

  it('exposes the variant as a data attribute', () => {
    const { container } = render(<Badge variant="warning">Pending</Badge>)
    expect(container.querySelector('[data-slot="badge"]')).toHaveAttribute(
      'data-variant',
      'warning'
    )
  })

  it('merges a caller className without dropping variant styles', () => {
    const { container } = render(<Badge variant="neutral" className="ml-2" />)
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('ml-2', 'border-border')
  })
})
