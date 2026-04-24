import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpcomingList } from '../UpcomingList'

const items = [
  { id: 'a', title: 'Close cohort 12', variant: 'info' as const },
  {
    id: 'b',
    title: 'Send quarterly report',
    subtitle: 'High priority',
    variant: 'warning' as const,
  },
]

describe('<UpcomingList />', () => {
  it('renders each item title', () => {
    render(<UpcomingList items={items} />)
    expect(screen.getByText('Close cohort 12')).toBeInTheDocument()
    expect(screen.getByText('Send quarterly report')).toBeInTheDocument()
  })

  it('renders optional subtitle text', () => {
    render(<UpcomingList items={items} />)
    expect(screen.getByText(/high priority/i)).toBeInTheDocument()
  })

  it('renders an empty state when there are no items', () => {
    render(<UpcomingList items={[]} emptyLabel="All caught up" />)
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })
})
