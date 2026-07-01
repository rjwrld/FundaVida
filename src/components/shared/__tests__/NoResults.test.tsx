import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoResults } from '../NoResults'

describe('<NoResults />', () => {
  it('renders the provided message', () => {
    render(<NoResults message="No students match your filter." />)
    expect(screen.getByText('No students match your filter.')).toBeInTheDocument()
  })

  it('applies the shared dashed-border styling', () => {
    render(<NoResults message="Nothing here." />)
    expect(screen.getByText('Nothing here.')).toHaveClass('border-dashed', 'text-muted-foreground')
  })
})
