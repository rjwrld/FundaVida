import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { NoResults } from '@/components/shared/NoResults'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates } from '@/hooks/api'
import { useCertificateBlobUrl } from '@/hooks/useCertificateBlobUrl'
import { useFormat } from '@/hooks/useFormat'
import type { CertificatePayload } from '@/lib/pdf/renderCertificate'
import { fullName } from '@/lib/personName'
import type { Course } from '@/types'

interface CardItem {
  id: string
  studentName: string
  programName: string
  score: number
  grade: string
  issuedAtIso: string
  issuedAt: string
}

/**
 * The Certificates module embedded in a Course's detail page: the owning Teacher
 * and admin see this Course's emitted Certificates and can preview/download each
 * (ADR-0024, list-only — closing the Course is what emits them). Gated by the
 * caller to the roster-viewing audience.
 */
export function CourseCertificatesSection({ course }: { course: Course }) {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const students = useStore((s) => s.students)
  const programName = useStore((s) => s.programs).find((p) => p.id === course.programId)?.name ?? ''
  const { data: certificates = [] } = useCertificates({ courseId: course.id })

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const result: CardItem[] = []
    for (const cert of certificates) {
      const student = studentById.get(cert.studentId)
      if (!student) continue
      result.push({
        id: cert.id,
        studentName: fullName(student),
        programName,
        score: cert.score,
        grade: formatGrade(cert.score),
        issuedAtIso: cert.issuedAt,
        issuedAt: formatDate(cert.issuedAt),
      })
    }
    return result
  }, [certificates, students, programName, formatDate, formatGrade])

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  )

  const payload = useMemo<CertificatePayload | null>(
    () =>
      selected
        ? {
            studentName: selected.studentName,
            courseName: course.name,
            programName: selected.programName,
            score: selected.score,
            issuedAt: selected.issuedAtIso,
          }
        : null,
    [selected, course.name]
  )
  const dataUrl = useCertificateBlobUrl(payload)

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('courses.detail.sections.certificates')}
      </h2>
      {items.length === 0 ? (
        <NoResults message={t('courses.detail.certificates.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CertificateCard
              key={item.id}
              cert={{
                id: item.id,
                studentName: item.studentName,
                courseName: course.name,
                issuedAt: item.issuedAt,
                grade: item.grade,
              }}
              onOpen={() => setSelectedId(item.id)}
            />
          ))}
        </div>
      )}

      <CertificatePreviewDialog
        open={selected !== null}
        payload={payload}
        dataUrl={dataUrl}
        downloadName={selected ? `certificate-${selected.id}.pdf` : 'certificate.pdf'}
        onClose={() => setSelectedId(null)}
      />
    </section>
  )
}
