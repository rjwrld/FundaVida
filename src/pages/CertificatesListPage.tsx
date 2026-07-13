import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NoResults } from '@/components/shared/NoResults'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { Pager } from '@/components/ui/pager'
import { usePagination } from '@/hooks/usePagination'
import { CertificatesEmpty } from '@/components/empty-states/CertificatesEmpty'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
import { fadeUp, staggerContainer, transitionFast } from '@/lib/motion'
import { fullName } from '@/lib/personName'

interface CardItem {
  id: string
  studentName: string
  courseId: string
  courseName: string
  programName: string
  score: number
  grade: string
  issuedAtIso: string
  issuedAt: string
}

interface CourseOption {
  id: string
  name: string
}

// Sentinel for the "all courses" filter option — Radix Select has no empty value.
const ALL_COURSES = '__all__'

/**
 * The Certificates gallery: a role-scoped grid of emitted Certificates, each
 * downloadable (a Certificate exists iff its PDF is available — ADR-0024). A
 * Student sees only their own; a Teacher their own Courses'; admin all. The only
 * action is preview/download — there is no approval (closing a Course emits them).
 */
export function CertificatesListPage() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { formatDate, formatGrade } = useFormat()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)
  const { data: certificates = [], isLoading } = useCertificates()

  const [query, setQuery] = useState('')
  const [courseId, setCourseId] = useState<string>(ALL_COURSES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const items = useMemo<CardItem[]>(() => {
    const studentById = new Map(students.map((s) => [s.id, s]))
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const programById = new Map(programs.map((p) => [p.id, p]))
    const result: CardItem[] = []
    for (const cert of certificates) {
      const student = studentById.get(cert.studentId)
      const course = courseById.get(cert.courseId)
      if (!student || !course) continue
      result.push({
        id: cert.id,
        studentName: fullName(student),
        courseId: cert.courseId,
        courseName: course.name,
        programName: programById.get(course.programId)?.name ?? '',
        score: cert.score,
        grade: formatGrade(cert.score),
        issuedAtIso: cert.issuedAt,
        issuedAt: formatDate(cert.issuedAt),
      })
    }
    return result
  }, [certificates, students, courses, programs, formatDate, formatGrade])

  // The courses present in this (already role-scoped) certificate list — a Teacher
  // sees only their own, an admin sees all. Lets the gallery be explored by course.
  const courseOptions = useMemo<CourseOption[]>(() => {
    const byId = new Map<string, string>()
    for (const c of items) byId.set(c.courseId, c.courseName)
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((c) => {
      if (courseId !== ALL_COURSES && c.courseId !== courseId) return false
      if (q && !c.studentName.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, query, courseId])

  // Window the already-filtered gallery (ADR-0026). A page size of 12 fills the
  // 4-column grid (3 rows) cleanly; the pager only appears once there is more
  // than one page. Filtering shrinks `visible`, and the hook clamps the page so
  // a narrowed result never points past the end.
  const pagination = usePagination(visible, { pageSize: 12 })

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  )

  // Pre-generate the PDF as a blob URL when a certificate is selected. The blob is
  // typed as application/octet-stream so headless Chromium treats it as a pure
  // download and respects the anchor's `download` attribute (PDFs would otherwise
  // route through the built-in viewer, which ignores it).
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

  const hasFilters = query.trim() !== '' || courseId !== ALL_COURSES

  // The filter chrome rides above both the filtered-empty and the populated
  // gallery, so it is hoisted once and shared by the two branches below; the
  // unfiltered-empty state (`CertificatesEmpty`) deliberately hides it.
  const filtersRow = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <SearchBox value={query} onChange={setQuery} />
      </div>
      {courseOptions.length > 1 && (
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger aria-label={t('certificates.list.filterByCourse')} className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_COURSES}>{t('certificates.list.allCourses')}</SelectItem>
            {courseOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('certificates.list.title')}
        description={t('certificates.list.subtitle')}
      />

      <ListView
        state={listViewState({ isLoading, count: visible.length, hasFilters })}
        skeleton={
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-busy="true"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
        empty={<CertificatesEmpty />}
        noResults={
          <div className="space-y-5">
            {filtersRow}
            <NoResults message={t('certificates.list.emptyFiltered', { query })} />
          </div>
        }
        content={
          <div className="space-y-5">
            {filtersRow}
            {/* Staggered card entrance on the DataTable card-grid pattern (phase
                6a): remount per page so each page re-runs the stagger, each card
                fades up, and reduced motion opts the whole grid out. */}
            <motion.div
              key={pagination.page}
              variants={reduce ? undefined : staggerContainer}
              initial={reduce ? false : 'hidden'}
              animate={reduce ? false : 'visible'}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {pagination.pageItems.map((c) => (
                <motion.div
                  key={c.id}
                  className="h-full"
                  variants={reduce ? undefined : fadeUp}
                  transition={transitionFast}
                >
                  <CertificateCard
                    className="h-full"
                    cert={{
                      id: c.id,
                      studentName: c.studentName,
                      courseName: c.courseName,
                      issuedAt: c.issuedAt,
                      grade: c.grade,
                    }}
                    onOpen={() => setSelectedId(c.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
            {pagination.pageCount > 1 && (
              <Pager pagination={pagination} pageSizeOptions={[12, 24, 48]} />
            )}
          </div>
        }
      />

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

function SearchBox({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('common.a11y.filters')} className="max-w-md">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('certificates.list.search.placeholder')}
          aria-label={t('certificates.list.search.ariaLabel')}
          className="pl-9"
        />
      </div>
    </section>
  )
}
