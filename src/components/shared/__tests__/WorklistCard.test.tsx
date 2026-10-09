import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorklistCard, WorklistRow } from '@/components/shared/WorklistCard'

function renderCard(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('<WorklistCard />', () => {
  it('is a region named by its h3 title', () => {
    renderCard(
      <WorklistCard title="Needs marking" icon={ClipboardCheck} emptyLabel="All caught up.">
        <WorklistRow to="/x" title="Row" />
      </WorklistCard>
    )

    const region = screen.getByRole('region', { name: 'Needs marking' })
    expect(within(region).getByRole('heading', { level: 3, name: 'Needs marking' })).toBeVisible()
  })

  it('shows the count badge only when there is work', () => {
    const { rerender } = renderCard(
      <WorklistCard title="Queue" icon={ClipboardCheck} count={3} emptyLabel="Empty.">
        <WorklistRow to="/x" title="Row" />
      </WorklistCard>
    )
    expect(screen.getByText('3')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <WorklistCard title="Queue" icon={ClipboardCheck} count={0} emptyLabel="Empty." />
      </MemoryRouter>
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renders the compact empty state when it has no rows', () => {
    renderCard(<WorklistCard title="Queue" icon={ClipboardCheck} emptyLabel="Nothing to do." />)

    expect(screen.getByText('Nothing to do.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('ends with a View all link when given one', () => {
    renderCard(
      <WorklistCard
        title="Queue"
        icon={ClipboardCheck}
        emptyLabel="Empty."
        viewAll={{ to: '/app/students', label: 'View all students' }}
      />
    )

    expect(screen.getByRole('link', { name: 'View all students' })).toHaveAttribute(
      'href',
      '/app/students'
    )
  })
})

describe('<WorklistRow />', () => {
  it('makes the whole row one link named by its title, with the subtitle beside it', () => {
    renderCard(
      <WorklistCard title="Queue" icon={ClipboardCheck} emptyLabel="Empty.">
        <WorklistRow to="/app/courses/cou-1" title="Inglés Primaria" subtitle="Session 3 · Oct 6" />
      </WorklistCard>
    )

    const link = screen.getByRole('link', { name: 'Inglés Primaria' })
    expect(link).toHaveAttribute('href', '/app/courses/cou-1')
    expect(screen.getByText('Session 3 · Oct 6')).toBeInTheDocument()
  })

  it('keeps its single action a sibling of the link, never nested inside it', () => {
    renderCard(
      <WorklistCard title="Queue" icon={ClipboardCheck} emptyLabel="Empty.">
        <WorklistRow to="/x" title="Row" action={<Button size="sm">Mark</Button>} />
      </WorklistCard>
    )

    const link = screen.getByRole('link', { name: 'Row' })
    const button = screen.getByRole('button', { name: 'Mark' })
    expect(link.contains(button)).toBe(false)
  })
})
