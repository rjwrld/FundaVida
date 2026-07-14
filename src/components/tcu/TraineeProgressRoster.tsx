import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCourses, useTcuActivities, useTcuTrainees } from '@/hooks/api'
import { resolveQueries } from '@/lib/resolveQueries'
import { tcuHoursByStatus, TCU_TARGET_HOURS } from '@/lib/tcuHours'
import { fullName } from '@/lib/personName'
import { useFormat } from '@/hooks/useFormat'

/**
 * Per-trainee progress for the approving roles (#367): one row per scoped
 * trainee — name, assigned Course, approved and pending hours, and progress
 * toward the {@link TCU_TARGET_HOURS} target — the same approved/pending split
 * the volunteer's own card derives ({@link tcuHoursByStatus}), so the two
 * surfaces cannot diverge (ADR-0036). Everything rides the scope seam
 * (ADR-0012): a Teacher's queries return only their Courses' trainees and
 * those trainees' activities; admin sees all. No matrix change.
 *
 * The roster doubles as the activity log's filter: selecting a row narrows the
 * log to that trainee (selecting it again clears), replacing the old
 * standalone trainee dropdown. The name is a real toggle button so the filter
 * is keyboard-reachable; the row click is a pointer convenience on top.
 *
 * All three reads gate together through {@link resolveQueries} (ADR-0030) — a
 * default-`[]` window would paint every trainee at 0 hours, a false verdict.
 */
export function TraineeProgressRoster({
  selectedTraineeId,
  onSelect,
}: {
  selectedTraineeId: string | null
  onSelect: (traineeId: string) => void
}) {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const activitiesQuery = useTcuActivities({})
  const traineesQuery = useTcuTrainees()
  const coursesQuery = useCourses()

  const gate = resolveQueries([activitiesQuery, traineesQuery, coursesQuery])
  if (gate.isPending) return null

  const [activities, trainees, courses] = gate.data
  if (trainees.length === 0) return null

  const courseNameById = new Map(courses.map((c) => [c.id, c.name]))

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('tcu.roster.title')}</h2>
      <Card className="overflow-hidden py-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>{t('tcu.list.columns.trainee')}</TableHead>
              <TableHead>{t('tcu.roster.columns.course')}</TableHead>
              <TableHead className="text-right font-mono tabular-nums">
                {t('tcu.roster.columns.approved')}
              </TableHead>
              <TableHead className="text-right font-mono tabular-nums">
                {t('tcu.roster.columns.pending')}
              </TableHead>
              <TableHead className="w-48">{t('tcu.roster.columns.progress')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainees.map((trainee) => {
              const { approved, pending } = tcuHoursByStatus(
                activities.filter((a) => a.traineeId === trainee.id)
              )
              const selected = trainee.id === selectedTraineeId
              return (
                <TableRow
                  key={trainee.id}
                  data-state={selected ? 'selected' : undefined}
                  className="h-12 cursor-pointer hover:bg-muted/40"
                  onClick={() => onSelect(trainee.id)}
                >
                  <TableCell>
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={t('tcu.roster.filterBy', { name: fullName(trainee) })}
                      className="font-medium hover:text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(trainee.id)
                      }}
                    >
                      {fullName(trainee)}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {courseNameById.get(trainee.courseId) ?? ''}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatNumber(approved)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatNumber(pending)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min((approved / TCU_TARGET_HOURS) * 100, 100)}
                        className="h-2"
                      />
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatNumber(approved)}/{TCU_TARGET_HOURS}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
