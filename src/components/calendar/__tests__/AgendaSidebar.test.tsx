import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { setDemoEpoch } from '@/lib/clock'
import { AgendaSidebar } from '../AgendaSidebar'
import type { RoleAgenda } from '@/lib/agenda'

const NOW = new Date(2026, 5, 15) // Monday, June 15, 2026

function isoDay(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString()
}

function renderSidebar(agenda: RoleAgenda, variant?: 'full' | 'banner') {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AgendaSidebar agenda={agenda} variant={variant} />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<AgendaSidebar />', () => {
  beforeEach(() => {
    setDemoEpoch(NOW)
    useStore.getState().setLocale('en')
  })

  describe('teacher', () => {
    it('renders a worklist grouped by course, deep-linked to the oldest unmarked session', () => {
      renderSidebar({
        role: 'teacher',
        upcoming: [],
        needsMarking: [],
        worklist: [
          {
            courseId: 'cou-A',
            courseName: 'Matemáticas Primaria — Linda Vista (jun)',
            sede: 'Linda Vista',
            count: 3,
            oldestDate: isoDay(2026, 5, 10),
            oldestOrdinal: 3,
          },
        ],
      })

      expect(screen.getByText('Needs marking')).toBeInTheDocument()
      // De-suffixed course name + a grouped count, not a row-per-session wall.
      const link = screen.getByRole('link', { name: /Matemáticas Primaria/ })
      expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
      expect(screen.getByText('3 sessions to mark')).toBeInTheDocument()
    })

    it('shows a quiet caught-up state when the worklist is empty', () => {
      renderSidebar({ role: 'teacher', upcoming: [], needsMarking: [], worklist: [] })
      expect(screen.getByText('All sessions marked')).toBeInTheDocument()
      expect(screen.getByText('Nothing pending in your courses.')).toBeInTheDocument()
    })

    it('banner variant compresses to the total sessions-to-mark, deep-linked', () => {
      renderSidebar(
        {
          role: 'teacher',
          upcoming: [],
          needsMarking: [],
          worklist: [
            {
              courseId: 'cou-A',
              courseName: 'Matemáticas Primaria — Linda Vista (jun)',
              sede: 'Linda Vista',
              count: 3,
              oldestDate: isoDay(2026, 5, 10),
              oldestOrdinal: 3,
            },
          ],
        },
        'banner'
      )
      const link = screen.getByRole('link', { name: /3 sessions to mark/ })
      expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
    })

    it('renders the Upcoming bucket', () => {
      renderSidebar({
        role: 'teacher',
        upcoming: [
          { courseId: 'cou-A', date: isoDay(2026, 5, 20), ordinal: 4, courseName: 'Matemáticas' },
        ],
        needsMarking: [],
        worklist: [],
      })
      expect(screen.getByText('Upcoming')).toBeInTheDocument()
    })
  })

  describe('admin', () => {
    it('renders the operational pulse as deep-linked stat rows, not a per-session list', () => {
      renderSidebar({
        role: 'admin',
        upcoming: [],
        pulse: { unmarkedCount: 3, coursesToCloseCount: 2 },
      })

      expect(screen.getByText('Operational pulse')).toBeInTheDocument()
      expect(screen.getByText('unmarked sessions in active courses')).toBeInTheDocument()
      // Term-ended cohorts are counted, not ready ones — most are still blocked, so
      // the label must not promise "ready" (the Courses-to-close card says why).
      expect(screen.getByText('courses to close')).toBeInTheDocument()
      expect(screen.queryByText(/ready to close/i)).not.toBeInTheDocument()
      const view = screen.getByRole('link', { name: /View/ })
      expect(view.getAttribute('href')).toBe('/app/attendance')
      const review = screen.getByRole('link', { name: /Review/ })
      expect(review.getAttribute('href')).toBe('/app/courses')
    })

    it('shows a quiet caught-up state when the pulse is zero', () => {
      renderSidebar({
        role: 'admin',
        upcoming: [],
        pulse: { unmarkedCount: 0, coursesToCloseCount: 0 },
      })
      expect(screen.getByText('All sessions marked')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /View/ })).not.toBeInTheDocument()
    })
  })
})
