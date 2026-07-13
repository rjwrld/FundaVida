import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { NoResults } from '@/components/shared/NoResults'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { fullName } from '@/lib/personName'
import type { Student } from '@/types'

interface CardItem {
  id: string
  courseName: string
  programName: string
  score: number
  grade: string
  issuedAtIso: string
  issuedAt: string
}

/**
 * The Certificates a Student has earned, on their profile (ADR-0012 scope seam):
 * a scoped grid of their emitted Certificates, each downloadable (a Certificate
 * exists iff its PDF is available — ADR-0024). Mirrors CourseCertificatesSection,
 * keyed by Student rather than Course. The only action is preview/download.
 */
export function StudentCertificatesSection({ student }: { student: Student }) {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)
  const { data: certificates = [] } = useCertificates({ studentId: student.id })
  const studentName = fullName(student)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const programById = new Map(programs.map((p) => [p.id, p]))
    const result: CardItem[] = []
    for (const cert of certificates) {
      const course = courseById.get(cert.courseId)
      if (!course) continue
      result.push({
        id: cert.id,
        courseName: course.name,
        programName: programById.get(course.programId)?.name ?? '',
        score: cert.score,
        grade: formatGrade(cert.score),
        issuedAtIso: cert.issuedAt,
        issuedAt: formatDate(cert.issuedAt),
      })
    }
    return result
  }, [certificates, courses, programs, formatDate, formatGrade])

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  )

  // Pre-generate the PDF as an opaque blob URL when a certificate is selected,
  // matching the gallery's download behavior. The renderer module is dynamically
  // imported so the @react-pdf graph loads only on first preview (#353).
  useEffect(() => {
    if (!selected) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    import('@/lib/pdf/renderCertificate')
      .then(({ renderCertificateBlob }) =>
        renderCertificateBlob({
          studentName,
          courseName: selected.courseName,
          programName: selected.programName,
          score: selected.score,
          issuedAt: selected.issuedAtIso,
        })
      )
      .then((blob) => {
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setDataUrl(createdUrl)
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [selected, studentName])

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('students.detail.sections.certificates')}
      </h2>
      {items.length === 0 ? (
        <NoResults message={t('students.detail.certificates.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CertificateCard
              key={item.id}
              cert={{
                id: item.id,
                studentName,
                courseName: item.courseName,
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
        payload={
          selected
            ? {
                studentName,
                courseName: selected.courseName,
                programName: selected.programName,
                score: selected.score,
                issuedAt: selected.issuedAtIso,
              }
            : null
        }
        dataUrl={dataUrl}
        downloadName={selected ? `certificate-${selected.id}.pdf` : 'certificate.pdf'}
        onClose={() => setSelectedId(null)}
      />
    </section>
  )
}
