import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/PageHeader'
import { CertificatesEmpty } from '@/components/empty-states/CertificatesEmpty'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFormat } from '@/hooks/useFormat'
import { buildEligibleList, type EligibleCertificate } from '@/lib/certificates'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
import { fadeUp, transitionDefaults } from '@/lib/motion'

interface CardItem {
  id: string
  studentId: string
  courseId: string
  studentName: string
  courseName: string
  programName: string
  score: number
  issuedAtIso: string
  issuedAt: string
  status: 'issued' | 'pending'
}

export function CertificatesListPage() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const currentUser = useCurrentUser()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const grades = useStore((s) => s.grades)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<EligibleCertificate | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const all = buildEligibleList(students, courses, grades)
    const scoped =
      currentUser?.role === 'student' ? all.filter((c) => c.studentId === currentUser.id) : all
    const result: CardItem[] = []
    for (const c of scoped) {
      const student = students.find((s) => s.id === c.studentId)
      const course = courses.find((co) => co.id === c.courseId)
      if (!student || !course) continue
      result.push({
        id: `${c.studentId}-${c.courseId}`,
        studentId: c.studentId,
        courseId: c.courseId,
        studentName: `${student.firstName} ${student.lastName}`,
        courseName: course.name,
        programName: course.programName,
        score: c.score,
        issuedAtIso: c.issuedAt,
        issuedAt: formatDate(c.issuedAt),
        status: 'issued',
      })
    }
    return result
  }, [students, courses, grades, currentUser, formatDate])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => c.studentName.toLowerCase().includes(q))
  }, [items, query])

  const selectedStudent = selected ? students.find((s) => s.id === selected.studentId) : null
  const selectedCourse = selected ? courses.find((c) => c.id === selected.courseId) : null

  // Pre-generate the PDF as a blob URL when a row is selected. The blob is
  // typed as application/octet-stream so headless Chromium treats it as a
  // pure download and respects the anchor's `download` attribute (PDFs would
  // otherwise be routed through the built-in viewer which ignores it).
  const selectedStudentId = selected?.studentId ?? null
  const selectedCourseId = selected?.courseId ?? null
  const selectedScore = selected?.score ?? null
  const selectedIssuedAt = selected?.issuedAt ?? null
  useEffect(() => {
    if (
      !selectedStudentId ||
      !selectedCourseId ||
      selectedScore === null ||
      selectedIssuedAt === null
    ) {
      setDataUrl(null)
      return
    }
    const student = students.find((s) => s.id === selectedStudentId)
    const course = courses.find((c) => c.id === selectedCourseId)
    if (!student || !course) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    pdf(
      <CertificateTemplate
        studentName={`${student.firstName} ${student.lastName}`}
        courseName={course.name}
        programName={course.programName}
        score={selectedScore}
        issuedAt={selectedIssuedAt}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, selectedCourseId, selectedScore, selectedIssuedAt])

  const downloadName =
    selectedStudent && selectedCourse
      ? `certificate-${selectedStudent.id}-${selectedCourse.id}.pdf`
      : 'certificate.pdf'

  const previewPayload =
    selected && selectedStudent && selectedCourse
      ? {
          studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
          courseName: selectedCourse.name,
          programName: selectedCourse.programName,
          score: selected.score,
          issuedAt: selected.issuedAt,
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
                    status: c.status,
                  }}
                  onClick={() =>
                    setSelected({
                      studentId: c.studentId,
                      courseId: c.courseId,
                      score: c.score,
                      issuedAt: c.issuedAtIso,
                    })
                  }
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
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
