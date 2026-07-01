import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { NoResults } from '@/components/shared/NoResults'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
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
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const result: CardItem[] = []
    for (const cert of certificates) {
      const student = studentById.get(cert.studentId)
      if (!student) continue
      result.push({
        id: cert.id,
        studentName: `${student.firstName} ${student.lastName}`,
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

  // Pre-generate the PDF as an opaque blob URL when a certificate is selected,
  // matching the global gallery's download behavior.
  useEffect(() => {
    if (!selected) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    pdf(
      <CertificateTemplate
        studentName={selected.studentName}
        courseName={course.name}
        programName={selected.programName}
        score={selected.score}
        issuedAt={selected.issuedAtIso}
      />
    )
      .toBlob()
      .then((blob) => {
        if (cancelled) return
        const opaque = new Blob([blob], { type: 'application/octet-stream' })
        createdUrl = URL.createObjectURL(opaque)
        setDataUrl(createdUrl)
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [selected, course.name])

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
        payload={
          selected
            ? {
                studentName: selected.studentName,
                courseName: course.name,
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
