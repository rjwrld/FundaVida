import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { CertificatesEmpty } from '@/components/empty-states/CertificatesEmpty'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { CertificateCard } from '@/components/certificates/CertificateCard'
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog'
import { useStore } from '@/data/store'
import { useCertificates, useApproveCertificate, useApproveCertificates } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CertificateStatus } from '@/types'

interface CardItem {
  id: string
  studentName: string
  courseId: string
  courseName: string
  programName: string
  score: number
  grade: string
  status: CertificateStatus
  // approvedAt for approved (the PDF's issue date), createdAt while pending.
  issuedAtIso: string
  issuedAt: string
}

interface CourseOption {
  id: string
  name: string
}

type Tab = 'pending' | 'approved'

// Sentinel for the "all courses" filter option — Radix Select has no empty value.
const ALL_COURSES = '__all__'

function parseStatusFilter(value: string | null): CertificateStatus | null {
  return value === 'pending' || value === 'approved' ? value : null
}

export function CertificatesListPage() {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const role = useStore((s) => s.role)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)
  const { data: certificates = [], isLoading } = useCertificates()
  const approve = useApproveCertificate()
  const approveAll = useApproveCertificates()
  // A Student views their own Certificates from the receiving side (ADR-0012):
  // pending reads as "in review" with the download disabled. Admin and a Course's
  // Teacher are approvers and get the pending-first worklist instead (ADR-0019).
  const isRecipient = role === 'student'

  // The dashboard "Pending approvals" widget links here with ?status=pending.
  const [searchParams] = useSearchParams()
  const statusFilter = parseStatusFilter(searchParams.get('status'))

  const [query, setQuery] = useState('')
  const [courseId, setCourseId] = useState<string>(ALL_COURSES)
  const [tab, setTab] = useState<Tab>(statusFilter === 'approved' ? 'approved' : 'pending')
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
      const dateIso =
        cert.status === 'approved' ? (cert.approvedAt ?? cert.createdAt) : cert.createdAt
      result.push({
        id: cert.id,
        studentName: `${student.firstName} ${student.lastName}`,
        courseId: cert.courseId,
        courseName: course.name,
        programName: programById.get(course.programId)?.name ?? '',
        score: cert.score,
        grade: formatGrade(cert.score),
        status: cert.status,
        issuedAtIso: dateIso,
        issuedAt: formatDate(dateIso),
      })
    }
    return result
  }, [certificates, students, courses, programs, formatDate, formatGrade])

  const bySearch = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list: CardItem[]) =>
      q ? list.filter((c) => c.studentName.toLowerCase().includes(q)) : list
  }, [query])

  // The courses present in this (already role-scoped) certificate list — a Teacher
  // sees only their own, an admin sees all. Lets the worklist be explored by course.
  const courseOptions = useMemo<CourseOption[]>(() => {
    const byId = new Map<string, string>()
    for (const c of items) byId.set(c.courseId, c.courseName)
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  // A course filter narrows to one course; the tab counts and Approve all follow it.
  const inCourse = useMemo(
    () => (list: CardItem[]) =>
      courseId === ALL_COURSES ? list : list.filter((c) => c.courseId === courseId),
    [courseId]
  )

  const pending = useMemo(
    () => inCourse(items.filter((c) => c.status === 'pending')),
    [items, inCourse]
  )
  const approved = useMemo(
    () => inCourse(items.filter((c) => c.status === 'approved')),
    [items, inCourse]
  )

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

  // Only an actually-loaded, empty list shows the empty state — never the
  // async loading gap, which would briefly flash "No certificates issued yet".
  const isEmpty = !isLoading && items.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('certificates.list.title')}
        description={t('certificates.list.subtitle')}
      />

      {isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy="true"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isEmpty ? (
        <CertificatesEmpty />
      ) : isRecipient ? (
        <RecipientGallery
          items={bySearch(items)}
          query={query}
          onQueryChange={setQuery}
          onOpen={(id) => setSelectedId(id)}
          noMatches={bySearch(items).length === 0}
        />
      ) : (
        <ApproverWorklist
          tab={tab}
          onTabChange={setTab}
          pending={bySearch(pending)}
          approved={bySearch(approved)}
          pendingTotal={pending.length}
          approvedTotal={approved.length}
          query={query}
          onQueryChange={setQuery}
          courseOptions={courseOptions}
          courseId={courseId}
          onCourseChange={setCourseId}
          onApprove={(id) => approve.mutate(id)}
          onApproveAll={() => approveAll.mutate(pending.map((c) => c.id))}
          approving={approve.isPending || approveAll.isPending}
          onOpen={(id) => setSelectedId(id)}
        />
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

/** A Student's own-certificates gallery: pending reads as "in review" (ADR-0012). */
function RecipientGallery({
  items,
  query,
  onQueryChange,
  onOpen,
  noMatches,
}: {
  items: CardItem[]
  query: string
  onQueryChange: (next: string) => void
  onOpen: (id: string) => void
  noMatches: boolean
}) {
  const { t } = useTranslation()
  return (
    <>
      <SearchBox value={query} onChange={onQueryChange} />
      {noMatches ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('certificates.list.noMatches', { query })}
        </p>
      ) : (
        <CardGrid items={items} onOpen={onOpen} recipientView />
      )}
    </>
  )
}

/** Admin / Teacher approver view: a pending-first worklist (ADR-0019). */
function ApproverWorklist({
  tab,
  onTabChange,
  pending,
  approved,
  pendingTotal,
  approvedTotal,
  query,
  onQueryChange,
  courseOptions,
  courseId,
  onCourseChange,
  onApprove,
  onApproveAll,
  approving,
  onOpen,
}: {
  tab: Tab
  onTabChange: (next: Tab) => void
  pending: CardItem[]
  approved: CardItem[]
  pendingTotal: number
  approvedTotal: number
  query: string
  onQueryChange: (next: string) => void
  courseOptions: CourseOption[]
  courseId: string
  onCourseChange: (next: string) => void
  onApprove: (id: string) => void
  onApproveAll: () => void
  approving: boolean
  onOpen: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('certificates.list.title')} className="flex gap-1">
          <TabButton
            active={tab === 'pending'}
            count={pendingTotal}
            onClick={() => onTabChange('pending')}
          >
            {t('certificates.worklist.tabs.pending')}
          </TabButton>
          <TabButton
            active={tab === 'approved'}
            count={approvedTotal}
            onClick={() => onTabChange('approved')}
          >
            {t('certificates.worklist.tabs.approved')}
          </TabButton>
        </div>
        {tab === 'pending' && pendingTotal > 0 && (
          <Button
            size="sm"
            onClick={onApproveAll}
            disabled={approving}
            aria-label={t('certificates.worklist.approveAllAria', { total: pendingTotal })}
          >
            {t('certificates.worklist.approveAll')}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBox value={query} onChange={onQueryChange} />
        </div>
        {courseOptions.length > 1 && (
          <Select value={courseId} onValueChange={onCourseChange}>
            <SelectTrigger
              aria-label={t('certificates.worklist.filterByCourse')}
              className="sm:w-56"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COURSES}>{t('certificates.worklist.allCourses')}</SelectItem>
              {courseOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === 'pending' ? (
        pending.length === 0 ? (
          <EmptyTab
            message={
              query.trim()
                ? t('certificates.list.noMatches', { query })
                : t('certificates.worklist.emptyPending')
            }
          />
        ) : (
          <PendingTable items={pending} onApprove={onApprove} approving={approving} />
        )
      ) : approved.length === 0 ? (
        <EmptyTab
          message={
            query.trim()
              ? t('certificates.list.noMatches', { query })
              : t('certificates.worklist.emptyApproved')
          }
        />
      ) : (
        <CardGrid items={approved} onOpen={onOpen} />
      )}
    </div>
  )
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-card text-foreground shadow-card'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
      <Badge variant={active ? 'default' : 'neutral'}>{count}</Badge>
    </button>
  )
}

function PendingTable({
  items,
  onApprove,
  approving,
}: {
  items: CardItem[]
  onApprove: (id: string) => void
  approving: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>{t('certificates.worklist.columns.student')}</TableHead>
            <TableHead>{t('certificates.worklist.columns.course')}</TableHead>
            <TableHead>{t('certificates.worklist.columns.issued')}</TableHead>
            <TableHead className="text-right">{t('certificates.worklist.columns.grade')}</TableHead>
            <TableHead className="text-right">
              {t('certificates.worklist.columns.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow key={c.id} className="h-12 hover:bg-muted/40">
              <TableCell className="font-medium text-foreground">{c.studentName}</TableCell>
              <TableCell className="text-muted-foreground">{c.courseName}</TableCell>
              <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                {c.issuedAt}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                {c.grade}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => onApprove(c.id)}
                  disabled={approving}
                  aria-label={t('certificates.list.approveAria', { student: c.studentName })}
                  data-testid={`approve-${c.id}`}
                >
                  {t('certificates.list.approve')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CardGrid({
  items,
  onOpen,
  recipientView,
}: {
  items: CardItem[]
  onOpen: (id: string) => void
  recipientView?: boolean
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={transitionDefaults}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {items.map((c) => (
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
          onOpen={c.status === 'approved' ? () => onOpen(c.id) : undefined}
          recipientView={recipientView}
        />
      ))}
    </motion.div>
  )
}

function EmptyTab({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}
