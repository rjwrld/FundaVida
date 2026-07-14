import { pdf } from '@react-pdf/renderer'
import { CertificateTemplate, type CertificatePayload } from './CertificateTemplate'

export type { CertificatePayload }

/**
 * Render a Certificate to a downloadable Blob. The blob is typed as
 * application/octet-stream so headless Chromium treats it as a pure download
 * and respects the anchor's `download` attribute (PDFs would otherwise route
 * through the built-in viewer, which ignores it).
 *
 * This module is the app's only entry into the @react-pdf graph — by far the
 * heaviest dependency subtree (pdfkit, fontkit, yoga, brotli, …) — and every
 * caller reaches it via dynamic `import()`, so the whole PDF pipeline stays out
 * of the route chunks until a certificate is actually previewed (#353).
 */
export async function renderCertificateBlob(payload: CertificatePayload): Promise<Blob> {
  const blob = await pdf(<CertificateTemplate {...payload} />).toBlob()
  return new Blob([blob], { type: 'application/octet-stream' })
}
