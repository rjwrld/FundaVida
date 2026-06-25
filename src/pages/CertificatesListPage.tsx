import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/PageHeader'
import { CertificatesEmpty } from '@/components/empty-states/CertificatesEmpty'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { can } from '@/permissions'
import { useCertificates, useApproveCertificate } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import type { CertificateStatus } from '@/types'

interface CardItem {
  id: string
  studentName: string
  courseName: string
  programName: string
  score: number
  grade: string
  status: CertificateStatus
  // approvedAt for approved (the PDF's issue date), createdAt while pending.
  issuedAtIso: string
  issuedAt: string
}

function parseStatusFilter(value: string | null): CertificateStatus | null {
  return value === 'pending' || value === 'approved' ? value : null
}

export function CertificatesListPage() {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const role = useStore((s) => s.role)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const { data: certificates = [] } = useCertificates()
  const approve = useApproveCertificate()
  const canApprove = role ? can(role, 'approve', 'certificates') : false

  // The dashboard "Pending approvals" widget links here with ?status=pending.
  const [searchParams] = useSearchParams()
  const statusFilter = parseStatusFilter(searchParams.get('status'))

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const result: CardItem[] = []
    for (const cert of certificates) {
      const student = studentById.get(cert.studentId)
      const course = courseById.get(cert.courseId)
      if (!student || !course) continue
      const dateIso =
        cert.status === 'approved' ? (cert.approvedAt ?? cert.createdAt) : cert.createdAt
      result.push({
        id: cert.id,
        studentName: `${student.firstName} ${student.lastName}`,
        courseName: course.name,
        programName: course.programName,
        score: cert.score,
        grade: formatGrade(cert.score),
        status: cert.status,
        issuedAtIso: dateIso,
        issuedAt: formatDate(dateIso),
      })
    }
    return result
  }, [certificates, students, courses, formatDate, formatGrade])

  const statusFiltered = useMemo(
    () => (statusFilter ? items.filter((c) => c.status === statusFilter) : items),
    [items, statusFilter]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return statusFiltered
    return statusFiltered.filter((c) => c.studentName.toLowerCase().includes(q))
  }, [statusFiltered, query])

  // Only an approved Certificate has a PDF to preview/download.
  const selected = useMemo(
    () => items.find((c) => c.id === selectedId && c.status === 'approved') ?? null,
    [items, selectedId]
  )

  // Pre-generate the PDF as a blob URL when an approved certificate is selected.
  // The blob is typed as application/octet-stream so headless Chromium treats it
  // as a pure download and respects the anchor's `download` attribute (PDFs would
  // otherwise route through the built-in viewer, which ignores it).
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
        courseName={selected.courseName}
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
  }, [selected])

  const downloadName = selected ? `certificate-${selected.id}.pdf` : 'certificate.pdf'

  const previewPayload = selected
    ? {
        studentName: selected.studentName,
        courseName: selected.courseName,
        programName: selected.programName,
        score: selected.score,
        issuedAt: selected.issuedAtIso,
      }
    : null

  const isEmpty = items.length === 0
  const hasNoMatches = !isEmpty && filtered.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('certificates.list.title')}
        description={t('certificates.list.subtitle')}
      />

      {isEmpty ? (
        <CertificatesEmpty />
      ) : (
        <>
          <section aria-label={t('common.a11y.filters')} className="max-w-md">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('certificates.list.search.placeholder')}
                aria-label={t('certificates.list.search.ariaLabel')}
                className="pl-9"
              />
            </div>
          </section>

          {hasNoMatches ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t('certificates.list.noMatches', { query })}
            </p>
          ) : (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={transitionDefaults}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filtered.map((c) => (
                <CertificateCard
                  key={c.id}
                  cert={{
                    id: c.id,
                    studentName: c.studentName,
                    courseName: c.courseName,
                    issuedAt: c.issuedAt,
                    grade: c.grade,
                    status: c.status,
                  }}
                  onOpen={c.status === 'approved' ? () => setSelectedId(c.id) : undefined}
                  onApprove={
                    canApprove && c.status === 'pending' ? () => approve.mutate(c.id) : undefined
                  }
                  approving={approve.isPending}
                />
              ))}
            </motion.div>
          )}
        </>
      )}

      <CertificatePreviewDialog
        open={selected !== null}
        payload={previewPayload}
        dataUrl={dataUrl}
        downloadName={downloadName}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
