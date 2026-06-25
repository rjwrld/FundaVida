import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

  it('offers a PDF preview but no approval for an approved certificate', async () => {
    useStore.getState().setRole('admin')
    injectCertificate('approved')
    renderPage()

    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
  })

  it('shows a student their own certificate read-only (no approve action)', async () => {
    // injectCertificate targets students[0] === stu-1, the student persona.
    useStore.getState().setRole('student')
    injectCertificate('approved')
    renderPage()

    expect(await screen.findByRole('button', { name: /open preview/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve certificate/i })).toBeNull()
  })
})
