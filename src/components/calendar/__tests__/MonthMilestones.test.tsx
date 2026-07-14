import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import type { Milestone, MilestoneKind } from '@/lib/monthMilestones'
import { MonthMilestones } from '../MonthMilestones'

const NO_NEAREST = { prev: null, next: null }

function renderList(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>)
}

function milestone(
  kind: MilestoneKind,
  dayOfJune: number,
  extra: Partial<Milestone> = {}
): Milestone {
  return {
    kind,
    date: new Date(2026, 5, dayOfJune).toISOString(),
    courseId: 'cou-A',
    courseName: 'Inglés Primaria — Linda Vista',
    ...extra,
  }
}

describe('<MonthMilestones />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('reads each milestone as a row: glyph, name, date', () => {
    renderList(
      <MonthMilestones
        milestones={[milestone('cohortStart', 6), milestone('cohortEnd', 24)]}
        nearest={NO_NEAREST}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'This month' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Inglés Primaria — Linda Vista · starts Jun 6' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Inglés Primaria — Linda Vista · ends Jun 24' })
    ).toBeInTheDocument()
  })

  it('names the deviation an exception carries', () => {
    renderList(
      <MonthMilestones
        milestones={[
          milestone('cancelled', 10, { note: 'Feriado' }),
          milestone('rescheduledFrom', 15, { note: 'Aula no disponible' }),
          milestone('rescheduledTo', 17, { note: 'Aula no disponible' }),
        ]}
        nearest={NO_NEAREST}
        onSelect={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', {
        name: 'Inglés Primaria — Linda Vista · cancelled Jun 10 · Feriado',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /· moved from Jun 15 · Aula no disponible/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /· moved to Jun 17 · Aula no disponible/ })
    ).toBeInTheDocument()
  })

  it('doubles as the legend: every row carries the glyph its cell does', () => {
    const { container } = renderList(
      <MonthMilestones
        milestones={[
          milestone('cohortStart', 6),
          milestone('cohortEnd', 24),
          milestone('cancelled', 10),
        ]}
        nearest={NO_NEAREST}
        onSelect={vi.fn()}
      />
    )

    expect(container.querySelector('[data-milestone="cohortStart"]')).toHaveClass('bg-success')
    expect(container.querySelector('[data-milestone="cohortEnd"]')).not.toBeNull()
    expect(container.querySelector('[data-milestone="cancelled"]')).toHaveClass('bg-destructive')
  })

  it('performs the navigator move on a row tap: the milestone’s own day', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderList(
      <MonthMilestones
        milestones={[milestone('cohortStart', 6)]}
        nearest={NO_NEAREST}
        onSelect={onSelect}
      />
    )

    await user.click(screen.getByRole('button', { name: /starts Jun 6/ }))

    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 5, 6))
  })

  it('points somewhere when the month is quiet', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderList(
      <MonthMilestones
        milestones={[]}
        nearest={{
          prev: milestone('cohortEnd', 24, { date: new Date(2026, 4, 24).toISOString() }),
          next: milestone('cohortStart', 3, { date: new Date(2026, 6, 3).toISOString() }),
        }}
        onSelect={onSelect}
      />
    )

    expect(screen.getByText('No milestones this month.')).toBeInTheDocument()
    expect(screen.getByText(/Next: .* · starts Jul 3/)).toBeInTheDocument()
    expect(screen.getByText(/Previous: .* · ends May 24/)).toBeInTheDocument()

    // The jump is the same navigator move a row is; `next` is offered first.
    const [nextJump] = screen.getAllByRole('button', { name: /Jump to that week/ })
    expect(nextJump).toBeDefined()
    if (nextJump) await user.click(nextJump)
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 6, 3))
  })

  it('never dead-ends against a fabricated date at the term map’s edge', () => {
    renderList(<MonthMilestones milestones={[]} nearest={NO_NEAREST} onSelect={vi.fn()} />)

    expect(screen.getByText('No milestones this month.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Jump to that week/ })).not.toBeInTheDocument()
  })

  // Last: switching the store locale flips i18next asynchronously, and the
  // singleton leaks into any test that renders after it.
  it('localizes the row copy and orders the date the Spanish way', async () => {
    useStore.getState().setLocale('es')
    renderList(
      <MonthMilestones
        milestones={[milestone('cancelled', 10, { note: 'Feriado' })]}
        nearest={NO_NEAREST}
        onSelect={vi.fn()}
      />
    )

    const list = await screen.findByRole('heading', { name: 'Este mes' })
    expect(list).toBeInTheDocument()
    expect(
      within(screen.getByRole('list')).getByRole('button', {
        name: 'Inglés Primaria — Linda Vista · cancelada el 10 jun · Feriado',
      })
    ).toBeInTheDocument()
  })
})
