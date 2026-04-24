import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlameSeparator } from '../FlameSeparator'

describe('<FlameSeparator />', () => {
  it('renders with a separator role', () => {
    render(<FlameSeparator />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('renders an optional label', () => {
    render(<FlameSeparator label="Milestone" />)
    expect(screen.getByText(/milestone/i)).toBeInTheDocument()
  })
})
