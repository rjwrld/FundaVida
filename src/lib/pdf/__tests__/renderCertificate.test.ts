import { describe, expect, it } from 'vitest'
import { renderCertificateBlob } from '../renderCertificate'
// The template translates through the app's i18next instance, initialized at boot.
import '@/lib/i18n'

describe('renderCertificateBlob', () => {
  it('renders a certificate to an opaque octet-stream blob', async () => {
    const blob = await renderCertificateBlob({
      studentName: 'Ana Rojas',
      courseName: 'Guitarra Básico — San José (mar)',
      programName: 'Guitarra',
      score: 85,
      issuedAt: '2026-03-15T12:00:00.000Z',
      locale: 'es',
    })
    // octet-stream (not application/pdf) so headless Chromium treats the URL as
    // a pure download and honors the anchor's `download` attribute.
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBeGreaterThan(0)
  })
})
