import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { CertificatesListPage } from '@/pages/CertificatesListPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Certificate } from '@/types'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
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

function injectCertificate(status: Certificate['status']): Certificate {
  const { students, courses } = useStore.getState()
  const student = students[0]
  const course = courses[0]
  if (!student || !course) throw new Error('seed missing student/course')
  const cert: Certificate = {
    id: `cert-test-${status}`,
    studentId: student.id,
    courseId: course.id,
    score: 88,
    status,
    createdAt: new Date().toISOString(),
    ...(status === 'approved' ? { approvedAt: new Date().toISOString(), approvedBy: 'admin' } : {}),
  }
  useStore.setState({ certificates: [cert] })
  return cert
}

describe('<CertificatesListPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('lets an admin approve a pending certificate from the ?status=pending view', async () => {
    useStore.getState().setRole('admin')
    const pendingBefore = useStore.getState().certificates.filter((c) => c.status === 'pending')
    expect(pendingBefore.length).toBeGreaterThan(0)

    renderPage('/app/certificates?status=pending')

    const approveButtons = await screen.findAllByRole('button', { name: /approve certificate/i })
    expect(approveButtons.length).toBe(pendingBefore.length)

    const [firstApprove] = approveButtons
    if (!firstApprove) throw new Error('expected at least one approve button')
    fireEvent.click(firstApprove)

    await waitFor(() => {
      const pendingNow = useStore.getState().certificates.filter((c) => c.status === 'pending')
      expect(pendingNow.length).toBe(pendingBefore.length - 1)
    })
  })

  it('offers approval but no PDF preview for a pending certificate', async () => {
    useStore.getState().setRole('admin')
    injectCertificate('pending')
    renderPage()

    expect(await screen.findByRole('button', { name: /approve certificate/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open preview/i })).toBeNull()
  })

  /** The approver worklist defaults to the pending tab; approved certs live behind the Approved tab. */
  async function showApprovedTab() {
    fireEvent.click(await screen.findByRole('tab', { name: /^approved/i }))
  }

  it('renders the certificate content as readable DOM in the preview dialog', async () => {
    useStore.getState().setRole('admin')
    const cert = injectCertificate('approved')
    const { students, courses } = useStore.getState()
    const student = students.find((s) => s.id === cert.studentId)
    const course = courses.find((c) => c.id === cert.courseId)
    if (!student || !course) throw new Error('seed missing student/course')
    renderPage()

    await showApprovedTab()
    fireEvent.click(await screen.findByRole('button', { name: /open preview/i }))

    // The preview must be real DOM so it renders without a native PDF viewer
    // (a bare <iframe> blob shows blank in headless/embedded browsers).
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(`${student.firstName} ${student.lastName}`)).toBeInTheDocument()
    expect(within(dialog).getByText(/certificate of completion/i)).toBeInTheDocument()
  })

  it('mirrors the certificate details (course, program, score) in the preview', async () => {
    useStore.getState().setRole('admin')
    const cert = injectCertificate('approved')
    const { courses, programs } = useStore.getState()
    const course = courses.find((c) => c.id === cert.courseId)
    if (!course) throw new Error('seed missing course')
    const programName = programs.find((p) => p.id === course.programId)?.name
    if (!programName) throw new Error('seed missing program')
    renderPage()

    await showApprovedTab()
    fireEvent.click(await screen.findByRole('button', { name: /open preview/i }))

    const dialog = await screen.findByRole('dialog')
    // The on-screen preview must match the downloadable PDF artifact field-for-field.
    expect(
      within(dialog).getByText(
        new RegExp(`completed ${course.name} \\(${programName}\\).*score of ${cert.score}`, 'i')
      )
    ).toBeInTheDocument()
  })

  it('offers a PDF preview but no approval for an approved certificate', async () => {
    useStore.getState().setRole('admin')
    injectCertificate('approved')
    renderPage()

    await showApprovedTab()
    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
  })

  it('defaults to the needs-approval tab and bulk-approves every pending certificate', async () => {
    useStore.getState().setRole('admin')
    const pendingBefore = useStore.getState().certificates.filter((c) => c.status === 'pending')
    expect(pendingBefore.length).toBeGreaterThan(1)

    renderPage()

    // The pending-first worklist opens on "Needs approval" with one Approve all action.
    fireEvent.click(await screen.findByRole('button', { name: /approve all/i }))

    await waitFor(() => {
      expect(useStore.getState().certificates.some((c) => c.status === 'pending')).toBe(false)
    })
  })

  it('lets a teacher approve a pending certificate in their own course', async () => {
    useStore.getState().setRole('teacher') // currentUserId === 'tea-1'
    const { currentUserId, courses, certificates } = useStore.getState()
    const ownCourseIds = new Set(
      courses.filter((c) => c.teacherId === currentUserId).map((c) => c.id)
    )
    const ownPending = certificates.filter(
      (c) => c.status === 'pending' && ownCourseIds.has(c.courseId)
    )
    expect(ownPending.length).toBeGreaterThan(0)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /approve certificate/i }))

    await waitFor(() => {
      const stillPending = useStore
        .getState()
        .certificates.filter((c) => c.status === 'pending' && ownCourseIds.has(c.courseId))
      expect(stillPending.length).toBe(ownPending.length - 1)
    })
  })

  it('shows a student their own certificate read-only (no approve action)', async () => {
    // injectCertificate targets students[0] === stu-1, the student persona.
    useStore.getState().setRole('student')
    injectCertificate('approved')
    renderPage()

    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
  })

  it('labels a student’s pending certificate as in review with the download disabled', async () => {
    useStore.getState().setRole('student')
    injectCertificate('pending')
    renderPage()

    // The receiving side calls a pending Certificate "in review" (CONTEXT.md).
    expect(await screen.findByText(/in review/i)).toBeInTheDocument()

    // The PDF is not available until approval: the download is present but disabled.
    const download = screen.getByRole('button', { name: /download pdf/i })
    expect(download).toBeDisabled()

    // A Student never approves their own Certificate.
    expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
  })

  it('shows a student only their own certificate, never a classmate’s', async () => {
    const { students, courses } = useStore.getState()
    const self = students[0]
    const classmate = students[1]
    const course = courses[0]
    if (!self || !classmate || !course) throw new Error('seed missing students/course')
    const approvedAt = new Date().toISOString()
    useStore.setState({
      certificates: [
        {
          id: 'cert-self',
          studentId: self.id,
          courseId: course.id,
          score: 90,
          status: 'approved',
          createdAt: approvedAt,
          approvedAt,
          approvedBy: 'admin',
        },
        {
          id: 'cert-other',
          studentId: classmate.id,
          courseId: course.id,
          score: 95,
          status: 'approved',
          createdAt: approvedAt,
          approvedAt,
          approvedBy: 'admin',
        },
      ],
    })
    // setRole('student') binds currentUserId to stu-1 === students[0]; the scope
    // seam (ADR-0008/0012) collapses the list to self.
    useStore.getState().setRole('student')
    renderPage()

    const previews = await screen.findAllByRole('button', { name: /open preview/i })
    expect(previews).toHaveLength(1)
    expect(screen.queryByText(`${classmate.firstName} ${classmate.lastName}`)).toBeNull()
  })

  it('makes an admin-approved certificate downloadable after switching to the student role', async () => {
    // The student first sees their own certificate in review, with no download.
    useStore.getState().setRole('student')
    injectCertificate('pending')
    renderPage()
    expect(await screen.findByText(/in review/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open preview/i })).toBeNull()

    // An admin approves it through the real action (which invalidates the
    // certificates query key shared across roles).
    act(() => {
      useStore.getState().setRole('admin')
    })
    fireEvent.click(await screen.findByRole('button', { name: /approve certificate/i }))
    await waitFor(() => {
      expect(useStore.getState().certificates.every((c) => c.status === 'approved')).toBe(true)
    })

    // Back as the student, the PDF download is offered — the role-keyed query
    // refetched rather than serving a stale "in review" card (#87).
    act(() => {
      useStore.getState().setRole('student')
    })
    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
    expect(screen.queryByText(/in review/i)).toBeNull()
  })

  it('drops an approved certificate out of the needs-approval list and into Approved', async () => {
    useStore.getState().setRole('admin')
    injectCertificate('pending')
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /approve certificate/i }))

    // Approval invalidates the certificates query key; the same-keyed worklist
    // refetches in place and the pending row disappears without a remount.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
    })

    // It now lives under the Approved tab as a downloadable preview.
    fireEvent.click(screen.getByRole('tab', { name: /^approved/i }))
    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
  })
})
