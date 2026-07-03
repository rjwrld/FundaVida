import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import type { CloseReadiness } from '@/lib/closeReadiness'
import type { Session } from '@/lib/sessions'
import { CloseReadinessChecklist } from '../CloseReadinessChecklist'

function session(ordinal: number): Session {
  return { courseId: 'cou-x', date: `2026-05-0${ordinal}`, ordinal }
}

function renderChecklist(readiness: CloseReadiness) {
  return render(
    <I18nProvider>
      <CloseReadinessChecklist readiness={readiness} />
    </I18nProvider>
  )
}

describe('<CloseReadinessChecklist />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('renders both fail rows with counts and a blocked verdict when the course is not ready', () => {
    renderChecklist({
      ungradedStudentIds: ['stu-a', 'stu-b', 'stu-c'],
      unrecordedSessions: [session(1), session(2)],
      ready: false,
    })

    expect(screen.getByRole('heading', { name: 'Close readiness' })).toBeInTheDocument()
    expect(screen.getByText('3 students ungraded')).toBeInTheDocument()
    expect(screen.getByText('2 sessions unrecorded')).toBeInTheDocument()
    expect(screen.getByTestId('close-readiness-verdict')).toHaveTextContent('Blocked')
  })

  it('uses the singular plural forms for a single blocker of each kind', () => {
    renderChecklist({
      ungradedStudentIds: ['stu-a'],
      unrecordedSessions: [session(1)],
      ready: false,
    })

    expect(screen.getByText('1 student ungraded')).toBeInTheDocument()
    expect(screen.getByText('1 session unrecorded')).toBeInTheDocument()
  })

  it('renders both pass rows and a ready verdict when the course is ready', () => {
    renderChecklist({ ungradedStudentIds: [], unrecordedSessions: [], ready: true })

    expect(screen.getByText('All approved students are graded.')).toBeInTheDocument()
    expect(screen.getByText('All past sessions have attendance records.')).toBeInTheDocument()
    expect(screen.getByTestId('close-readiness-verdict')).toHaveTextContent('Ready to close')
  })

  it('marks up the two checks as a semantic list', () => {
    renderChecklist({ ungradedStudentIds: [], unrecordedSessions: [], ready: true })

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('resolves all copy in Spanish (no raw keys rendered)', () => {
    useStore.getState().setLocale('es')
    renderChecklist({
      ungradedStudentIds: ['stu-a', 'stu-b'],
      unrecordedSessions: [session(1)],
      ready: false,
    })

    expect(screen.queryByText(/courses\.detail\.readiness/)).not.toBeInTheDocument()
    expect(screen.getByText('2 estudiantes sin calificar')).toBeInTheDocument()
    expect(screen.getByText('1 sesión sin registrar')).toBeInTheDocument()
  })
})
