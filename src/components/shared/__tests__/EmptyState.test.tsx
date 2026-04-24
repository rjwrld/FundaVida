import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../EmptyState'

describe('<EmptyState />', () => {
  it('renders heading and body copy', () => {
    render(<EmptyState heading="No students yet" body="Add your first learner to begin." />)
    expect(screen.getByRole('heading', { name: /no students yet/i })).toBeInTheDocument()
    expect(screen.getByText(/add your first learner/i)).toBeInTheDocument()
  })

  it('renders the action button and handles clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState heading="No data" body="Nothing here." action={{ label: 'Add one', onClick }} />
    )
    await user.click(screen.getByRole('button', { name: /add one/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders a custom illustration when provided', () => {
    render(
      <EmptyState
        heading="Empty"
        body="Empty."
        illustration={<svg data-testid="illus" aria-hidden="true" />}
      />
    )
    expect(screen.getByTestId('illus')).toBeInTheDocument()
  })
})
