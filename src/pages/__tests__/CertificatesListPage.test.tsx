import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { I18nProvider } from '@/lib/i18n'
import { fullName } from '@/lib/personName'
import { CertificatesListPage } from '@/pages/CertificatesListPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Certificate } from '@/types'

// Reduced by default (the historical behavior of this suite); individual tests
// flip it to false to exercise the staggered gallery entrance (phase 6a) — the
// vi.fn seam per the data-table/tabs precedent.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: vi.fn(() => true) }
})

function renderPage(entry = '/app/certificates') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[entry]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/app/certificates" element={<CertificatesListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** Replace the store's certificates with a single one for students[0] (stu-1). */
function injectCertificate(): Certificate {
  const { students, courses } = useStore.getState()
  const student = students[0]
  const course = courses[0]
  if (!student || !course) throw new Error('seed missing student/course')
  const cert: Certificate = {
    id: 'cert-test',
    studentId: student.id,
    courseId: course.id,
    score: 88,
    issuedAt: new Date().toISOString(),
  }
  useStore.setState({ certificates: [cert] })
  return cert
}

describe('<CertificatesListPage />', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('shows an admin a gallery of previewable certificate cards', async () => {
    useStore.getState().setRole('admin')
    injectCertificate()
    renderPage()

    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
  })

  // Phase 6a: the gallery enters through the staggered card-grid pattern; the
  // animated path must render the same cards the reduced path does.
  it('renders the gallery through the staggered entrance when motion is allowed', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(false)
    useStore.getState().setRole('admin')
    injectCertificate()
    renderPage()

    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
  })

  it('never offers an approval affordance (approval removed, ADR-0024)', async () => {
    useStore.getState().setRole('admin')
    renderPage()

    await screen.findAllByRole('button', { name: /open preview/i })
    expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /approve all/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /needs approval/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /^approved/i })).toBeNull()
  })

  it('renders the certificate content as readable DOM in the preview dialog', async () => {
    useStore.getState().setRole('admin')
    const cert = injectCertificate()
    const { students, courses } = useStore.getState()
    const student = students.find((s) => s.id === cert.studentId)
    const course = courses.find((c) => c.id === cert.courseId)
    if (!student || !course) throw new Error('seed missing student/course')
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /open preview/i }))

    // The preview must be real DOM so it renders without a native PDF viewer
    // (a bare <iframe> blob shows blank in headless/embedded browsers).
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(fullName(student))).toBeInTheDocument()
    expect(within(dialog).getByText(/certificate of completion/i)).toBeInTheDocument()
  })

  it('mirrors the certificate details (course, program, score) in the preview', async () => {
    useStore.getState().setRole('admin')
    const cert = injectCertificate()
    const { courses, programs } = useStore.getState()
    const course = courses.find((c) => c.id === cert.courseId)
    if (!course) throw new Error('seed missing course')
    const programName = programs.find((p) => p.id === course.programId)?.name
    if (!programName) throw new Error('seed missing program')
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /open preview/i }))

    const dialog = await screen.findByRole('dialog')
    // The on-screen preview must match the downloadable PDF artifact field-for-field.
    // Course names carry regex-significant characters (e.g. the "(ene 2026)" term
    // suffix, ADR-0021), so escape the dynamic parts before building the matcher.
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expect(
      within(dialog).getByText(
        new RegExp(
          `completed ${escapeRegExp(course.name)} \\(${escapeRegExp(programName)}\\).*score of ${cert.score}`,
          'i'
        )
      )
    ).toBeInTheDocument()
  })

  it('shows a student only their own certificate, never a classmate’s', async () => {
    const { students, courses } = useStore.getState()
    const self = students[0]
    const classmate = students[1]
    const course = courses[0]
    if (!self || !classmate || !course) throw new Error('seed missing students/course')
    const issuedAt = new Date().toISOString()
    useStore.setState({
      certificates: [
        { id: 'cert-self', studentId: self.id, courseId: course.id, score: 90, issuedAt },
        { id: 'cert-other', studentId: classmate.id, courseId: course.id, score: 95, issuedAt },
      ],
    })
    // setRole('student') binds currentUserId to stu-1 === students[0]; the scope
    // seam (ADR-0008/0012) collapses the list to self.
    useStore.getState().setRole('student')
    renderPage()

    const previews = await screen.findAllByRole('button', { name: /open preview/i })
    expect(previews).toHaveLength(1)
    expect(screen.queryByText(fullName(classmate))).toBeNull()
  })

  it('filters the gallery by course', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    const { certificates, courses } = useStore.getState()
    const certCourseIds = [...new Set(certificates.map((c) => c.courseId))]
    expect(certCourseIds.length).toBeGreaterThan(1)
    const target = courses.find((c) => c.id === certCourseIds[0])
    const other = courses.find((c) => c.id === certCourseIds[1])
    if (!target || !other) throw new Error('expected two cert-bearing courses')

    renderPage()
    await screen.findAllByRole('button', { name: /open preview/i })
    // Both courses' cards are present before filtering.
    expect(screen.getAllByText(other.name).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('combobox', { name: /filter by course/i }))
    await user.click(await screen.findByRole('option', { name: target.name }))

    // Only the chosen course's certificates remain in the gallery.
    await screen.findAllByText(target.name)
    expect(screen.queryByText(other.name)).toBeNull()
  })

  it('shows the empty state when no certificates exist', async () => {
    useStore.getState().setRole('admin')
    useStore.setState({ certificates: [] })
    renderPage()

    expect(await screen.findByText(/no certificates issued yet/i)).toBeInTheDocument()
  })

  it('windows the gallery to a bounded page size instead of rendering every card', async () => {
    useStore.getState().setRole('admin')
    const total = useStore.getState().certificates.length
    expect(total).toBeGreaterThan(12) // guard: the seed must exceed one page

    renderPage()

    // Only the first page of cards renders, not all of them.
    const cards = await screen.findAllByRole('button', { name: /open preview/i })
    expect(cards).toHaveLength(12)

    // The pager reports the full total across multiple pages.
    expect(screen.getByText(`Page 1 of ${Math.ceil(total / 12)}`)).toBeInTheDocument()
  })
})
