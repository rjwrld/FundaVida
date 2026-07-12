import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { ListHeaderBand } from '@/components/shared/ListHeaderBand'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useCourses } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { CourseFilters } from '@/data/api/courses'

export function BrowseCoursesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<CourseFilters>({
    scopeOverride: 'browseable',
    openOnly: true,
  })
  const { data = [], isLoading } = useCourses(filters)
  const programs = useStore((s) => s.programs)
  const enrollments = useStore((s) => s.enrollments)

  const hasFilters = Boolean(filters.search)
  const count = data.length

  const programName = (programId: string) =>
    programs.find((p) => p.id === programId)?.name ?? programId

  const getSeatsRemaining = (course: (typeof data)[0]) => {
    const approvedCount = enrollments.filter(
      (e) => e.courseId === course.id && e.status === 'approved'
    ).length
    return Math.max(0, course.capacity - approvedCount)
  }

  const isFull = (course: (typeof data)[0]) => getSeatsRemaining(course) === 0

  return (
    <div className="space-y-6">
      <PageHeader title={t('courses.browse.title')} description={t('courses.browse.subtitle')} />

      <div className="relative">
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

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={5} />}
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
          <Card className="overflow-hidden py-0 gap-0">
            <ListHeaderBand label={t('courses.browse.title')} count={count} />
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>{t('courses.list.columns.name')}</TableHead>
                  <TableHead>{t('courses.list.columns.program')}</TableHead>
                  <TableHead>{t('courses.form.fields.level')}</TableHead>
                  <TableHead>{t('courses.browse.columns.seats')}</TableHead>
                  <TableHead className="text-right">
                    {t('courses.browse.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => {
                  const seatsRemaining = getSeatsRemaining(c)
                  const full = isFull(c)

                  return (
                    <TableRow key={c.id} className="h-12 hover:bg-muted/40">
                      <TableCell>
                        <button
                          onClick={() => navigate(`/app/courses/${c.id}`)}
                          className="hover:underline text-left"
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell>{programName(c.programId)}</TableCell>
                      <TableCell>{t(`courses.level.${c.level}`)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">
                            {seatsRemaining}/{c.capacity}
                          </p>
                          {full && (
                            <Badge variant="destructive" className="text-xs">
                              {t('courses.browse.full')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/app/courses/${c.id}`)}
                          variant="outline"
                        >
                          {t('courses.browse.viewButton')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        }
      />
    </div>
  )
}
