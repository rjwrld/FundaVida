import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import type { AttendanceRecord } from '@/types'
import { AttendanceHeatmapCard } from '../AttendanceHeatmapCard'

const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AttendanceHeatmapCard />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('AttendanceHeatmapCard', () => {
  let snapshot: AttendanceRecord[]

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
    snapshot = useStore.getState().attendance
  })
  afterEach(() => {
    useStore.setState({ attendance: snapshot })
  })

  it('renders an 84-cell (7×12) attendance grid from the scoped attendance', async () => {
    renderCard()
    const grid = await screen.findByRole('grid')
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(84)
  })

  it('shows the empty state when no attendance is recorded', async () => {
    useStore.setState({ attendance: [] })
    renderCard()
    expect(await screen.findByText('No attendance recorded yet.')).toBeInTheDocument()
  })
})
