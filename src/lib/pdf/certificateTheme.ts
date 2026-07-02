/**
 * The certificate colour palette, shared by the printable @react-pdf artifact
 * ({@link ./CertificateTemplate}) and its on-screen twin
 * ({@link ../../components/certificates/CertificatePreview}). Both surfaces must
 * render pixel-for-pixel identically, so the hex values live here once instead
 * of being copied into each file. These are print-fixed brand colours (not the
 * theme-able app tokens): the certificate looks the same in light and dark mode
 * and in the exported PDF.
 */
export const CERTIFICATE_COLORS = {
  /** Deep navy — border, "FUNDAVIDA" wordmark, and the student's name. */
  navy: '#1e3a8a',
  /** Near-black ink for the title and body copy. */
  ink: '#0f172a',
  /** Slate — the subtitle line under the title. */
  slate: '#475569',
  /** Muted slate — the small ISSUED / PROGRAM footer labels. */
  muted: '#64748b',
  /** Paper background. */
  paper: '#ffffff',
} as const
