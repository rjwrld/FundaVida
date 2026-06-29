import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates, useApproveCertificate } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useFormat } from '@/hooks/useFormat'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
import type { Course } from '@/types'

interface CardItem {
  id: string
  studentName: string
  programName: string
  score: number
  grade: string
  status: 'pending' | 'approved'
  issuedAtIso: string
  issuedAt: string
}

/**
 * The Certificates module embedded in a Course's detail page: the owning Teacher
 * and admin see this Course's earned Certificates and approve the pending ones
 * in context (ADR-0019, ADR-0022), with the same preview/download as the global
 * worklist. Gated by the caller to the roster-viewing audience.
 */
export function CourseCertificatesSection({ course }: { course: Course }) {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const students = useStore((s) => s.students)
  const programName = useStore((s) => s.programs).find((p) => p.id === course.programId)?.name ?? ''
  const { data: certificates = [] } = useCertificates({ courseId: course.id })
  const approve = useApproveCertificate()
  const canApprove = useCan('approve', 'certificates', { course })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const result: CardItem[] = []
    for (const cert of certificates) {
      const student = studentById.get(cert.studentId)
      if (!student) continue
      const dateIso =
        cert.status === 'approved' ? (cert.approvedAt ?? cert.createdAt) : cert.createdAt
      result.push({
        id: cert.id,
        studentName: `${student.firstName} ${student.lastName}`,
        programName,
        score: cert.score,
        grade: formatGrade(cert.score),
        status: cert.status,
        issuedAtIso: dateIso,
        issuedAt: formatDate(dateIso),
      })
    }
    return result
  }, [certificates, students, programName, formatDate, formatGrade])

  // Only an approved Certificate has a PDF to preview/download.
  const selected = useMemo(
    () => items.find((c) => c.id === selectedId && c.status === 'approved') ?? null,
    [items, selectedId]
  )

  // Pre-generate the PDF as an opaque blob URL when an approved certificate is
  // selected, matching the global worklist's download behavior.
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
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('courses.detail.certificates.empty')}
        </p>
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
                status: item.status,
              }}
              onOpen={item.status === 'approved' ? () => setSelectedId(item.id) : undefined}
              onApprove={
                canApprove && item.status === 'pending' ? () => approve.mutate(item.id) : undefined
              }
              approving={approve.isPending}
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
