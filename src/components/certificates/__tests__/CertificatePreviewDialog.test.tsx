import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'

const payload = {
  studentName: 'Ada Lovelace',
  courseName: 'Robotics 1',
  programName: 'STEM',
  score: 95,
  issuedAt: '2026-06-15T12:00:00Z',
  locale: 'en' as const,
}

function renderDialog(
  p: typeof payload | (Omit<typeof payload, 'locale'> & { locale: 'es' }) = payload
) {
  return render(
    <I18nProvider>
      <CertificatePreviewDialog
        open
        payload={p}
        dataUrl="data:application/pdf;base64,AAAA"
        downloadName="cert.pdf"
        onClose={vi.fn()}
      />
    </I18nProvider>
  )
}

describe('<CertificatePreviewDialog />', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('exposes an accessible description so assistive tech can announce the dialog', () => {
    renderDialog()
    // Radix wires aria-describedby to a generated id unconditionally; without a
    // matching <Description> element the reference dangles and the description is
    // empty (the a11y warning case). A non-empty accessible description proves the
    // Description is present and correctly linked.
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription()
  })

  it('renders the certificate in the locale it was opened in', () => {
    renderDialog({ ...payload, locale: 'es' })
    expect(screen.getByText('Certificado de finalización')).toBeInTheDocument()
    expect(screen.getByText(/completó satisfactoriamente Robotics 1 \(STEM\)/)).toBeInTheDocument()
  })
})
