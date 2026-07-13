import { useEffect, useMemo, useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { NoResults } from '@/components/shared/NoResults'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { fireConfetti } from '@/lib/confetti'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
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
  const certificatesQuery = useCertificates({ courseId: course.id })
  const { data: certificates = [] } = certificatesQuery

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  // The issuance celebration (ADR-0047 phase 6b). Closing the Course is what
  // emits Certificates (ADR-0024), and the close's write-set invalidation
  // refetches this list on the page already in view — so "a Certificate id we
  // have not seen since this list first resolved" IS the issuance moment.
  // Seeding the seen-set from the first resolved fetch (never the pending []),
  // keeps a plain page load, remount, or navigation from ever celebrating.
  const reduce = useReducedMotion()
  const seenIdsRef = useRef<Set<string> | null>(null)
  const [justIssuedIds, setJustIssuedIds] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    if (certificatesQuery.isPending) return
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(certificates.map((c) => c.id))
      return
    }
    const seen = seenIdsRef.current
    const fresh = certificates.filter((c) => !seen.has(c.id)).map((c) => c.id)
    if (fresh.length === 0) return
    fresh.forEach((id) => seen.add(id))
    if (reduce) return
    setJustIssuedIds(new Set(fresh))
    fireConfetti()
  }, [certificates, certificatesQuery.isPending, reduce])
  // Clear the shimmer marks once the sweep has played (fixed window — the
  // sweep is one-shot, this just keeps the celebration state from outliving
  // its moment).
  useEffect(() => {
    if (justIssuedIds.size === 0) return
    const timer = setTimeout(() => setJustIssuedIds(new Set()), 2500)
    return () => clearTimeout(timer)
  }, [justIssuedIds])

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
              justIssued={justIssuedIds.has(item.id)}
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
