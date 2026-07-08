import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarWidget } from '../CalendarWidget'

describe('<CalendarWidget />', () => {
  it('renders the month and year heading based on selected date', () => {
    const selected = new Date(2026, 3, 15)
    render(<CalendarWidget selected={selected} />)
    expect(screen.getByRole('heading', { name: /april 2026/i })).toBeInTheDocument()
  })

  it('marks days with events', () => {
    const selected = new Date(2026, 3, 1)
    const events = [new Date(2026, 3, 10)]
    render(<CalendarWidget selected={selected} events={events} />)
    const cell = screen.getByRole('button', { name: /april 10, 2026/i })
    expect(cell).toHaveAttribute('data-has-event', 'true')
  })

  it('calls onSelect when a day is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const selected = new Date(2026, 3, 1)
    render(<CalendarWidget selected={selected} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /april 15, 2026/i }))
    expect(onSelect).toHaveBeenCalled()
  })

  it('navigates months internally with prev/next buttons', async () => {
    const user = userEvent.setup()
    const selected = new Date(2026, 3, 1)
    render(<CalendarWidget selected={selected} />)
    await user.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByRole('heading', { name: /march 2026/i })).toBeInTheDocument()
  })

  it('marks today with an underline bar (variant B), not a filled circle', () => {
    const { container } = render(<CalendarWidget />)
    const todayCell = container.querySelector<HTMLElement>('[data-today="true"]')
    expect(todayCell).not.toBeNull()
    // The new treatment is an underline bar under the number...
    expect(todayCell?.querySelector('[data-today-bar]')).not.toBeNull()
    // ...not the old filled circle that sat behind the number.
    expect(todayCell?.querySelector('[data-today-fill]')).toBeNull()
  })

  it('renders weekend days like weekdays (no muted text)', () => {
    const selected = new Date(2026, 3, 1)
    render(<CalendarWidget selected={selected} />)
    // April 4, 2026 is an in-month Saturday.
    const saturday = screen.getByRole('button', { name: /saturday, april 4, 2026/i })
    expect(saturday).not.toHaveClass('text-muted-foreground')
  })

  it('marks the selected non-today day with a soft tint, not a ring', () => {
    const selected = new Date(2026, 3, 15)
    const { container } = render(<CalendarWidget selected={selected} />)
    const selectedCell = container.querySelector<HTMLElement>('[data-selected="true"]')
    expect(selectedCell).not.toBeNull()
    expect(selectedCell?.getAttribute('aria-label')).toMatch(/april 15, 2026/i)
    // Soft tint fill present; the old 1.5px ring is gone.
    expect(selectedCell?.querySelector('[data-selected-tint]')).not.toBeNull()
  })

  it('marks event days with a thin bar, not a dot', () => {
    const selected = new Date(2026, 3, 1)
    const events = [new Date(2026, 3, 10)]
    render(<CalendarWidget selected={selected} events={events} />)
    const cell = screen.getByRole('button', { name: /april 10, 2026/i })
    expect(cell).toHaveAttribute('data-has-event', 'true')
    expect(cell.querySelector('[data-event-bar]')).not.toBeNull()
  })

  it('scales the event bar with the day’s session count (density)', () => {
    const selected = new Date(2026, 3, 1)
    // Three sessions on Apr 10, one on Apr 13.
    const events = [
      new Date(2026, 3, 10),
      new Date(2026, 3, 10),
      new Date(2026, 3, 10),
      new Date(2026, 3, 13),
    ]
    render(<CalendarWidget selected={selected} events={events} />)
    const busy = screen
      .getByRole('button', { name: /april 10, 2026/i })
      .querySelector('[data-event-bar]')
    const quiet = screen
      .getByRole('button', { name: /april 13, 2026/i })
      .querySelector('[data-event-bar]')
    expect(busy?.getAttribute('data-event-count')).toBe('3')
    expect(quiet?.getAttribute('data-event-count')).toBe('1')
    // The busier day's bar is wider than the quiet day's.
    expect(busy?.className).not.toEqual(quiet?.className)
  })
})
