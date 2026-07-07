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

function renderSidebar(agenda: RoleAgenda) {
  return render(
    <I18nProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgendaSidebar agenda={agenda} />
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
    it('renders the needs-marking worklist as the hero, deep-linked to mark', () => {
      renderSidebar({
        role: 'teacher',
        upcoming: [],
        needsMarking: [
          {
            courseId: 'cou-A',
            date: isoDay(2026, 5, 10),
            ordinal: 3,
            courseName: 'Matemáticas',
            sede: 'Linda Vista',
          },
        ],
      })

      expect(screen.getByText('Needs marking')).toBeInTheDocument()
      const link = screen.getByRole('link', { name: /Matemáticas/ })
      expect(link.getAttribute('href')).toMatch(/\/app\/courses\/cou-A\/sessions\/.*\/mark/)
    })

    it('shows an empty-worklist message when nothing needs marking', () => {
      renderSidebar({ role: 'teacher', upcoming: [], needsMarking: [] })
      expect(screen.getByText('Nothing needs marking')).toBeInTheDocument()
    })

    it('renders the Upcoming bucket', () => {
      renderSidebar({
        role: 'teacher',
        upcoming: [
          { courseId: 'cou-A', date: isoDay(2026, 5, 20), ordinal: 4, courseName: 'Matemáticas' },
        ],
        needsMarking: [],
      })
      expect(screen.getByText('Upcoming')).toBeInTheDocument()
    })
  })

  describe('admin', () => {
    it('renders a summarized operational pulse, not a per-session list', () => {
      renderSidebar({
        role: 'admin',
        upcoming: [],
        pulse: { unmarkedCount: 3, coursesToCloseCount: 2 },
      })

      expect(screen.getByText('Operational pulse')).toBeInTheDocument()
      expect(screen.getByText('3 sessions need marking')).toBeInTheDocument()
      expect(screen.getByText('2 courses ready to close')).toBeInTheDocument()
    })

    it('shows the all-marked message when unmarkedCount is zero', () => {
      renderSidebar({
        role: 'admin',
        upcoming: [],
        pulse: { unmarkedCount: 0, coursesToCloseCount: 0 },
      })
      expect(screen.getByText('All sessions marked')).toBeInTheDocument()
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
