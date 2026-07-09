import { LogoMark } from '@/components/brand/LogoMark'
import { formatDate } from '@/lib/format'
import { CERTIFICATE_COLORS as C } from '@/lib/pdf/certificateTheme'

interface Props {
  studentName: string
  courseName: string
  programName: string
  score: number
  issuedAt: string
}

/**
 * On-screen rendition of the certificate, mirroring CertificateTemplate (the
 * @react-pdf artifact) field-for-field. The dialog renders this instead of
 * @react-pdf's <PDFViewer>, whose <iframe> blob shows blank in any browser
 * without a native inline PDF viewer (headless/embedded, or "download PDFs"
 * configured). The PDF itself is still generated for the Download action — this
 * is only the preview surface, so the copy stays English to match the artifact.
 *
 * Colours come from the shared {@link CERTIFICATE_COLORS} palette (not the
 * theme-able app tokens), applied inline so the preview and the PDF template
 * read from one source and can never drift.
 */
export function CertificatePreview({
  studentName,
  courseName,
  programName,
  score,
  issuedAt,
}: Props) {
  const issued = formatDate(issuedAt, 'en')
  return (
    // Size-query container + scroll area: the certificate scales to fit the smaller
    // of the available width/height (Option C), down to a 20rem readable floor, after
    // which the wrapper scrolls so the footer stays reachable on very short windows.
    <div
      className="flex h-full w-full items-center justify-center overflow-auto p-4"
      style={{ containerType: 'size', backgroundColor: C.paper }}
    >
      <div
        className="flex aspect-11/8.5 flex-col items-center justify-between border-4 p-6 text-center sm:p-10"
        style={{
          width: 'clamp(20rem, min(100cqw, 100cqh * 11 / 8.5), 42rem)',
          borderColor: C.navy,
          color: C.ink,
        }}
      >
        <div className="flex flex-col items-center">
          <LogoMark variant="mark" size="lg" alt="" className="mb-3" />
          <p className="text-xs tracking-[0.2em]" style={{ color: C.navy }}>
            FUNDAVIDA
          </p>
          <h3 className="mt-4 text-2xl font-bold sm:text-3xl">Certificate of Completion</h3>
          <p className="mt-2 text-xs" style={{ color: C.slate }}>
            Awarded in recognition of the successful completion of the course
          </p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-xl font-bold sm:text-2xl" style={{ color: C.navy }}>
            {studentName}
          </p>
          <p className="mt-3 text-sm" style={{ color: C.ink }}>
            has successfully completed {courseName} ({programName}) with a final score of {score}.
          </p>
        </div>
        <div className="flex w-full items-end justify-between">
          <div className="text-left">
            <p className="text-[10px] tracking-wide" style={{ color: C.muted }}>
              ISSUED
            </p>
            <p className="text-xs" style={{ color: C.ink }}>
              {issued}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[10px] tracking-wide" style={{ color: C.muted }}>
              PROGRAM
            </p>
            <p className="text-xs" style={{ color: C.ink }}>
              {programName}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
