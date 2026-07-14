import { useEffect, useState } from 'react'
import type { CertificatePayload } from '@/lib/pdf/renderCertificate'

/**
 * The downloadable blob URL for a Certificate PDF — null while nothing is
 * selected or the render is still in flight. One home for the effect the three
 * preview surfaces (gallery, Student profile, Course detail) used to hand-copy:
 * the renderer module is dynamically imported so the @react-pdf graph loads
 * only on first preview, never with a route chunk (#353), and the URL is
 * revoked on cleanup. The effect re-runs on payload identity, so callers pass
 * a memoized payload (or null).
 */
export function useCertificateBlobUrl(payload: CertificatePayload | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!payload) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    import('@/lib/pdf/renderCertificate')
      .then(({ renderCertificateBlob }) => renderCertificateBlob(payload))
      .then((blob) => {
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setDataUrl(createdUrl)
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [payload])
  return dataUrl
}
