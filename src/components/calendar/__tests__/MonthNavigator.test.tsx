import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import { MonthNavigator } from '../MonthNavigator'

const NOW = new Date(2026, 5, 17) // Wednesday, June 17, 2026

function renderNavigator(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>)
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

  it('scales the event bar with the day’s session count (ADR-0044 density)', () => {
    const events = [
      new Date(2026, 5, 10),
      new Date(2026, 5, 10),
      new Date(2026, 5, 10),
      new Date(2026, 5, 13),
    ]
    renderNavigator(<MonthNavigator events={events} />)

    const busy = screen
      .getByRole('button', { name: /Wednesday, June 10th, 2026/ })
      .querySelector('[data-event-bar]')
    const quiet = screen
      .getByRole('button', { name: /Saturday, June 13th, 2026/ })
      .querySelector('[data-event-bar]')

    expect(busy?.getAttribute('data-event-count')).toBe('3')
    expect(quiet?.getAttribute('data-event-count')).toBe('1')
    expect(busy?.className).not.toEqual(quiet?.className)
  })

  it('leaves days with no session unmarked', () => {
    renderNavigator(<MonthNavigator events={[new Date(2026, 5, 10)]} />)

    const quiet = screen.getByRole('button', { name: /Saturday, June 13th, 2026/ })
    expect(quiet.querySelector('[data-event-bar]')).toBeNull()
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
