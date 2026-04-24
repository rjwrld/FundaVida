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
})
