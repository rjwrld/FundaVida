import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, AlertCircle } from 'lucide-react'
import { NoResults } from '@/components/shared/NoResults'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useCourses, useCoursesSeats, useEnrollments } from '@/hooks/api'
import { resolveQueries } from '@/lib/resolveQueries'
import { BrowseRequestAction } from '@/components/courses/BrowseRequestAction'
import { useDataTableSurface } from '@/hooks/useDataTableSurface'
import { CourseTitleLink } from '@/components/courses/CourseTitleLink'
import type { CourseFilters } from '@/data/api/courses'
import type { Course } from '@/types'

/** Seats left in one open Course, from the page's single batched read. */
function SeatsLeft({ seats }: { seats: number | undefined }) {
  const { t } = useTranslation()
  if (seats === undefined) return <span className="text-muted-foreground">…</span>
  return <span className="tabular-nums">{t('courses.browse.seatsLeft', { count: seats })}</span>
}

/**
 * The student's Courses page (ADR-0043/0051): the open Courses at their Sede and
 * Level they can request ('browseable', ADR-0016), each with its Request action
 * on the row, plus the ones they have already requested — those stay listed as
 * Requested until a decision. Their approved Courses live on the dashboard's My
 * courses table, so this page only answers "what can I join?".
 */
export function BrowseCoursesPage() {
  const { t } = useTranslation()
  const surface = useDataTableSurface()
  const [filters, setFilters] = useState<CourseFilters>({
    scopeOverride: 'browseable',
    openOnly: true,
  })
  // Three reads make the rows: the open Courses they may request, the Courses
  // they hold any record in ('enrolled' scope — a pending request drops a Course
  // out of 'browseable'), and their own enrollments to tell which is pending.
  // A row's Request/Requested verdict joins all three, so the list waits for all
  // three (ADR-0030).
  const ownFilters: CourseFilters = { openOnly: true, search: filters.search }
  const openQuery = useCourses(filters)
  const mineQuery = useCourses(ownFilters)
  const ownEnrollmentsQuery = useEnrollments({})
  const gate = resolveQueries([openQuery, mineQuery, ownEnrollmentsQuery])
  // Memoized over the reads' stable `.data` refs, so the table keeps its rows
  // (and each row's Request button) across renders rather than remounting them.
  const open = openQuery.data
  const mine = mineQuery.data
  const ownEnrollments = ownEnrollmentsQuery.data
  const { data, enrollmentByCourse } = useMemo(() => {
    const byCourse = new Map((ownEnrollments ?? []).map((e) => [e.courseId, e]))
    const openIds = new Set((open ?? []).map((c) => c.id))
    const rows = [
      ...(open ?? []),
      ...(mine ?? []).filter((c) => !openIds.has(c.id) && byCourse.get(c.id)?.status === 'pending'),
    ].sort((a, b) => a.name.localeCompare(b.name))
    return { data: rows, enrollmentByCourse: byCourse }
  }, [open, mine, ownEnrollments])
  const isLoading = gate.isPending
  // Seats for every listed Course in one aggregate read (issue #166): a Student's
  // 'own' enrollment scope cannot count classmates, so the data layer counts and
  // never exposes who holds a seat.
  const { data: seatsById } = useCoursesSeats(data.map((c) => c.id))

  const hasFilters = Boolean(filters.search)
  const count = data.length

  const columns: DataTableColumn<Course>[] = [
    {
      id: 'name',
      header: t('courses.list.columns.name'),
      // The full name: a student's row has no Sede column, so the short name would
      // collide across cohorts (ADR-0021). Hover/focus warms the detail page, and
      // the link the visible surface renders morphs into its heading.
      cell: (c) => (
        <CourseTitleLink course={c} shared={surface === 'table'} fullName className="font-medium" />
      ),
    },
    {
      id: 'seats',
      header: t('courses.browse.columns.seats'),
      cell: (c) => <SeatsLeft seats={seatsById?.[c.id]} />,
    },
    {
      id: 'request',
      header: t('courses.browse.columns.request'),
      align: 'right',
      cell: (c) => (
        <BrowseRequestAction
          course={c}
          enrollment={enrollmentByCourse.get(c.id)}
          seats={seatsById?.[c.id]}
        />
      ),
    },
  ]

  // The stacked cards (below `sm`) own the shared element there instead, so only
  // one node per Course ever registers it (useDataTableSurface).
  const cardColumns: DataTableColumn<Course>[] = columns.map((column) =>
    column.id === 'name'
      ? {
          ...column,
          cell: (c: Course) => (
            <CourseTitleLink
              course={c}
              shared={surface === 'card'}
              fullName
              className="font-medium"
            />
          ),
        }
      : column
  )

  return (
    <div className="space-y-6">
      <PageHeader title={t('courses.browse.title')} description={t('courses.browse.subtitle')} />

      <section aria-label={t('common.a11y.filters')} className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('courses.browse.searchPlaceholder')}
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                search: e.target.value || undefined,
              }))
            }
            className="pl-9"
          />
        </div>
      </section>

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={4} columns={2} />}
        empty={
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-3 text-muted-foreground" size={32} />
              <p className="text-center text-sm text-muted-foreground">
                {t('courses.browse.empty')}
              </p>
            </CardContent>
          </Card>
        }
        noResults={<NoResults message={t('courses.browse.emptyFiltered')} />}
        content={
          <DataTable
            data={data}
            columns={columns}
            getRowKey={(c) => c.id}
            renderCard={(c) => (
              <DataTableCard
                row={c}
                columns={cardColumns}
                titleColumnId="name"
                actionsColumnId="request"
              />
            )}
          />
        }
      />
    </div>
  )
}
