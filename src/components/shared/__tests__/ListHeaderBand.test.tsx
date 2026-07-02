import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListHeaderBand } from '../ListHeaderBand'

describe('<ListHeaderBand />', () => {
  it('renders the label and count', () => {
    render(<ListHeaderBand label="Open courses" count={7} />)
    expect(screen.getByText('Open courses')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('is decorative (aria-hidden) since the table below carries the semantics', () => {
    const { container } = render(<ListHeaderBand label="Teachers" count={3} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
