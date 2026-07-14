import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import type { Milestone, MilestoneKind } from '@/lib/monthMilestones'
import { MonthNavigator } from '../MonthNavigator'

const NOW = new Date(2026, 5, 17) // Wednesday, June 17, 2026

function renderNavigator(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>)
}

/** A day cell, by the full date its accessible name carries. */
function cell(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(name) })
}

function milestone(kind: MilestoneKind, dayOfJune: number, courseId = 'cou-A'): Milestone {
  return {
    kind,
    date: new Date(2026, 5, dayOfJune).toISOString(),
    courseId,
    courseName: 'Inglés Primaria — Linda Vista',
  }
}

describe('<MonthNavigator />', () => {
  beforeEach(() => {
    setDemoEpoch(NOW)
    useStore.getState().setLocale('en')
  })

  it('opens on the frozen month and renders it as a heading', () => {
    renderNavigator(<MonthNavigator />)

    expect(screen.getByRole('heading', { name: 'June 2026' })).toBeInTheDocument()
  })

  it('calls onSelect with the tapped day', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderNavigator(<MonthNavigator onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /Monday, June 15th, 2026/ }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 5, 15))
  })

  it('marks the frozen today, not the wall-clock today', () => {
    const { container } = renderNavigator(<MonthNavigator />)

    const today = container.querySelector<HTMLElement>('[data-today="true"]')
    expect(today?.textContent).toBe('17')
    // The ARIA label carries the today hint so it is not a colour-only marker.
    expect(
      screen.getByRole('button', { name: 'Today, Wednesday, June 17th, 2026' })
    ).toBeInTheDocument()
  })

  it('gives every ordinary session day the same baseline dot (no density)', () => {
    // Two Sessions on the 10th, one on the 11th: the term map does NOT scale — a
    // periodic schedule has no density shape to reveal (ADR-0048).
    renderNavigator(
      <MonthNavigator
        sessionDays={[new Date(2026, 5, 10), new Date(2026, 5, 10), new Date(2026, 5, 11)]}
      />
    )

    const busy = cell('Wednesday, June 10th, 2026').querySelector('[data-session-dot]')
    const quiet = cell('Thursday, June 11th, 2026').querySelector('[data-session-dot]')

    expect(busy).not.toBeNull()
    expect(busy?.className).toEqual(quiet?.className)
  })

  it('leaves days with no session unmarked', () => {
    renderNavigator(<MonthNavigator sessionDays={[new Date(2026, 5, 10)]} />)

    expect(cell('Saturday, June 13th, 2026').querySelector('[data-session-dot]')).toBeNull()
  })

  it('replaces the baseline dot with the day’s notable glyph', () => {
    renderNavigator(
      <MonthNavigator
        sessionDays={[new Date(2026, 5, 10)]}
        milestones={[milestone('cancelled', 10)]}
      />
    )

    const day = cell('Wednesday, June 10th, 2026')
    expect(day.querySelector('[data-milestone="cancelled"]')).not.toBeNull()
    // A day is narrating a deviation OR it is an ordinary term day — never both.
    expect(day.querySelector('[data-session-dot]')).toBeNull()
  })

  it('renders each milestone kind with its own glyph', () => {
    renderNavigator(
      <MonthNavigator
        milestones={[
          milestone('cohortStart', 1),
          milestone('cohortEnd', 24),
          milestone('rescheduledFrom', 8),
          milestone('rescheduledTo', 12),
        ]}
      />
    )

    expect(
      cell('Monday, June 1st, 2026').querySelector('[data-milestone="cohortStart"]')
    ).toHaveClass('bg-success')
    expect(
      cell('Wednesday, June 24th, 2026').querySelector('[data-milestone="cohortEnd"]')
    ).not.toBeNull()
    // Both days of a reschedule are marked — the vacated one and the target.
    expect(
      cell('Monday, June 8th, 2026').querySelector('[data-milestone="rescheduledFrom"]')
    ).not.toBeNull()
    expect(
      cell('Friday, June 12th, 2026').querySelector('[data-milestone="rescheduledTo"]')
    ).not.toBeNull()
  })

  it('stacks at most two glyphs then a "+", never a pile', () => {
    renderNavigator(
      <MonthNavigator
        milestones={[
          milestone('cohortStart', 10, 'cou-A'),
          milestone('cohortEnd', 10, 'cou-B'),
          milestone('cancelled', 10, 'cou-C'),
        ]}
      />
    )

    const day = cell('Wednesday, June 10th, 2026')
    expect(day.querySelectorAll('[data-milestone]')).toHaveLength(2)
    expect(day.querySelector('[data-milestone-overflow]')?.textContent).toBe('+')
    // The first two are the caller's priority order, which `milestonesFor` sorts.
    expect(day.querySelector('[data-milestone="cohortStart"]')).not.toBeNull()
    expect(day.querySelector('[data-milestone="cancelled"]')).toBeNull()
  })

  it('shows no "+" when a day carries exactly two notables', () => {
    renderNavigator(
      <MonthNavigator
        milestones={[milestone('cohortStart', 10, 'cou-A'), milestone('cohortEnd', 10, 'cou-B')]}
      />
    )

    const day = cell('Wednesday, June 10th, 2026')
    expect(day.querySelectorAll('[data-milestone]')).toHaveLength(2)
    expect(day.querySelector('[data-milestone-overflow]')).toBeNull()
  })

  it('reports the month the user navigated to', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    renderNavigator(<MonthNavigator month={NOW} onMonthChange={onMonthChange} />)

    await user.click(screen.getByRole('button', { name: 'Next month' }))

    expect(onMonthChange).toHaveBeenCalledTimes(1)
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 6, 1))
  })

  it('navigates months with the labelled prev/next buttons', async () => {
    const user = userEvent.setup()
    renderNavigator(<MonthNavigator />)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { name: 'May 2026' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: 'July 2026' })).toBeInTheDocument()
  })

  // Last: switching the store locale flips i18next asynchronously, and the
  // singleton leaks into any test that renders after it.
  it('localizes the caption, weekdays, and day labels in Spanish', async () => {
    useStore.getState().setLocale('es')
    renderNavigator(<MonthNavigator />)

    expect(screen.getByRole('heading', { name: 'junio 2026' })).toBeInTheDocument()
    // The weekday row is `aria-hidden` (each day button carries the full date),
    // so it is only ever read as text.
    expect(screen.getByText('lu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'lunes, 15 de junio de 2026' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Mes anterior' })).toBeInTheDocument()
  })
})
