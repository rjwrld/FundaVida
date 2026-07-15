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
      expect(screen.getByText('courses ready to close')).toBeInTheDocument()
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

  describe('student', () => {
    it('renders "My progress" with present/total and cert standing', () => {
      renderSidebar({
        role: 'student',
        upcoming: [],
        progress: [
          {
            courseName: 'Matemáticas',
            sede: 'Linda Vista',
            present: 8,
            total: 10,
            onTrack: true,
            certificate: null,
          },
        ],
      })

      expect(screen.getByText('My progress')).toBeInTheDocument()
      expect(screen.getByText('8/10 attended')).toBeInTheDocument()
    })

    it('renders "no sessions recorded yet" instead of the on-track badge when total is 0', () => {
      renderSidebar({
        role: 'student',
        upcoming: [],
        progress: [
          {
            courseName: 'Matemáticas',
            sede: 'Linda Vista',
            present: 0,
            total: 0,
            onTrack: true,
            certificate: null,
          },
        ],
      })

      expect(screen.getByText('No sessions recorded yet')).toBeInTheDocument()
      expect(screen.queryByText('On track')).not.toBeInTheDocument()
    })

    it('shows certificate earned when a certificate exists', () => {
      renderSidebar({
        role: 'student',
        upcoming: [],
        progress: [
          {
            courseName: 'Matemáticas',
            sede: 'Linda Vista',
            present: 10,
            total: 10,
            onTrack: true,
            certificate: {
              id: 'cert-1',
              studentId: 'stu-1',
              courseId: 'cou-A',
              score: 90,
              issuedAt: isoDay(2026, 5, 1),
            },
          },
        ],
      })

      expect(screen.getByText('Certificate earned')).toBeInTheDocument()
    })
  })

  describe('tcu', () => {
    it('renders only the Upcoming bucket (read-only schedule)', () => {
      renderSidebar({
        role: 'tcu',
        upcoming: [
          { courseId: 'cou-A', date: isoDay(2026, 5, 20), ordinal: 4, courseName: 'Matemáticas' },
        ],
      })

      expect(screen.getByText('Upcoming')).toBeInTheDocument()
      expect(screen.queryByText('Needs marking')).not.toBeInTheDocument()
      expect(screen.queryByText('Operational pulse')).not.toBeInTheDocument()
      expect(screen.queryByText('My progress')).not.toBeInTheDocument()
      // Read-only: no links into a course.
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
  })
})
