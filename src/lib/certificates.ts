import type { Certificate } from '@/types'

/** A Grade at or above this score earns a Certificate. */
export const PASSING_SCORE = 70

/** A score earns a Certificate when it meets the passing threshold. */
export function isPassingScore(score: number): boolean {
  return score >= PASSING_SCORE
}

/** The PDF is available only once an admin has approved the Certificate. */
export function isCertificateDownloadable(certificate: Certificate): boolean {
  return certificate.status === 'approved'
}
