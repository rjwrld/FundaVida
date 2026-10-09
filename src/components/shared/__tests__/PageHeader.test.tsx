import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../PageHeader'

describe('<PageHeader />', () => {
  it('renders title and optional description', () => {
    render(<PageHeader title="Students" description="Manage everyone enrolled." />)
    expect(screen.getByRole('heading', { level: 1, name: /students/i })).toBeInTheDocument()
    expect(screen.getByText(/manage everyone enrolled/i)).toBeInTheDocument()
  })

  it('renders a meta line between the title and the description', () => {
    render(
      <PageHeader
        title="Matemáticas"
        meta={<span data-testid="meta">Hatillo · Jessica</span>}
        description="Refuerzo."
      />
    )
    const meta = screen.getByTestId('meta')
    expect(
      screen.getByRole('heading', { level: 1 }).compareDocumentPosition(meta) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      meta.compareDocumentPosition(screen.getByText('Refuerzo.')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('renders action slot content', () => {
    render(<PageHeader title="Courses" action={<button data-testid="add">Add course</button>} />)
    expect(screen.getByTestId('add')).toBeInTheDocument()
  })
})
