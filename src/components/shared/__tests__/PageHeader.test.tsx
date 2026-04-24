import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../PageHeader'

describe('<PageHeader />', () => {
  it('renders title and optional description', () => {
    render(<PageHeader title="Students" description="Manage everyone enrolled." />)
    expect(screen.getByRole('heading', { level: 1, name: /students/i })).toBeInTheDocument()
    expect(screen.getByText(/manage everyone enrolled/i)).toBeInTheDocument()
  })

  it('renders an eyebrow when provided', () => {
    render(<PageHeader eyebrow="Dashboard" title="Overview" />)
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
  })

  it('renders action slot content', () => {
    render(<PageHeader title="Courses" action={<button data-testid="add">Add course</button>} />)
    expect(screen.getByTestId('add')).toBeInTheDocument()
  })
})
