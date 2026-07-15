import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import type { Course } from '@/types'
import { NextSessionsList } from '../NextSessionsList'

// Tuesday inside the fixture term — the next MWF session is Wed 2026-06-24.
const EPOCH = new Date('2026-06-23T15:30:00.000Z')

const courseMWF: Course = {
  id: 'course-1',
  name: 'Math 101',
  description: 'Calculus',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'teacher-1',
  term: {
    start: '2026-06-01T00:00:00.000Z',
    end: '2026-07-31T00:00:00.000Z',
  },
  meetingDays: ['mon', 'wed', 'fri'],
  createdAt: '2026-01-01T00:00:00Z',
}

function renderList(courses: Course[]) {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <NextSessionsList courses={courses} />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('<NextSessionsList /> — mark-attendance link name (#339)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setLocale('en')
  })

  it('names each mark link "Mark attendance" so screen-reader link lists stay distinguishable', () => {
    renderList([courseMWF])

    const links = screen.getAllByRole('link', { name: 'Mark attendance' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\/app\/courses\/course-1\/sessions\/.+\/mark$/)
    }
    // The bare label is gone — no link is named just "Mark".
    expect(screen.queryByRole('link', { name: 'Mark' })).not.toBeInTheDocument()
  })
})
