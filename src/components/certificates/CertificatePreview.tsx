import { LogoMark } from '@/components/brand/LogoMark'
import { formatDate } from '@/lib/format'

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
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-white p-4">
      <div className="flex aspect-[11/8.5] w-full max-w-2xl flex-col items-center justify-between border-4 border-[#1e3a8a] p-6 text-center text-[#0f172a] sm:p-10">
        <div className="flex flex-col items-center">
          <LogoMark variant="mark" size="lg" alt="" className="mb-3" />
          <p className="text-xs tracking-[0.2em] text-[#1e3a8a]">FUNDAVIDA</p>
          <h3 className="mt-4 text-2xl font-bold sm:text-3xl">Certificate of Completion</h3>
          <p className="mt-2 text-xs text-[#475569]">
            Awarded in recognition of the successful completion of the course
          </p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-xl font-bold text-[#1e3a8a] sm:text-2xl">{studentName}</p>
          <p className="mt-3 text-sm text-[#0f172a]">
            has successfully completed {courseName} ({programName}) with a final score of {score}.
          </p>
        </div>
        <div className="flex w-full items-end justify-between">
          <div className="text-left">
            <p className="text-[10px] tracking-wide text-[#64748b]">ISSUED</p>
            <p className="text-xs text-[#0f172a]">{issued}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] tracking-wide text-[#64748b]">PROGRAM</p>
            <p className="text-xs text-[#0f172a]">{programName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
