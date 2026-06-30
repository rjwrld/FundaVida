import { useState, Fragment } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useAttendance,
  useCloseCourse,
  useCourse,
  useBrowseableCourse,
  useCourseSeats,
  useEnrollments,
  useGrades,
  useMarkAttendance,
  useStudents,
  useTcuTrainees,
  useUnenrollStudent,
  useRequestEnrollment,
  useWithdrawEnrollmentRequest,
} from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { findSession, sessionsFor } from '@/lib/sessions'
import { clock } from '@/lib/clock'
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  CourseStatus,
  Enrollment,
  Student,
} from '@/types'
import { GradeDialog } from '@/components/courses/GradeDialog'
import { EnrollStudentDialog } from '@/components/courses/EnrollStudentDialog'
import { CourseCertificatesSection } from '@/components/courses/CourseCertificatesSection'
import { shortCourseName } from '@/lib/courseName'
import { parseISO } from 'date-fns'

interface GradingTarget {
  studentId: string
  studentName: string
  initialScore?: number
}

function statusVariant(status: AttendanceStatus): 'success' | 'destructive' | 'info' {
  if (status === 'present') return 'success'
  if (status === 'absent') return 'destructive'
  return 'info'
}

function courseStatusVariant(status: CourseStatus): 'success' | 'secondary' | 'warning' {
  if (status === 'published') return 'success'
  if (status === 'closed') return 'secondary'
  return 'warning'
}

interface AttendanceMarkingSectionProps {
  course: Course
  courseEnrollments: Enrollment[]
  scopedStudents: Student[]
  selectedSessionDate: string | null
  onSessionSelect: (date: string | null) => void
  markAttendance: ReturnType<typeof useMarkAttendance>
  ownAttendance: AttendanceRecord[]
}

function AttendanceMarkingSection({
  course,
  courseEnrollments,
  scopedStudents,
  selectedSessionDate,
  onSessionSelect,
  markAttendance,
  ownAttendance,
}: AttendanceMarkingSectionProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  const allSessions = sessionsFor(course)
  const now = clock.now()
  const markableSessions = allSessions.filter((s) => parseISO(s.date) <= now)

  if (markableSessions.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('courses.detail.attendance.noMarkableSessions')}
      </p>
    )
  }

  const selected = selectedSessionDate
    ? markableSessions.find((s) => s.date === selectedSessionDate)
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {markableSessions.map((session) => (
          <Button
            key={session.date}
            variant={selectedSessionDate === session.date ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSessionSelect(session.date)}
          >
            {t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<
              string,
              string
            >)}{' '}
            · {formatDate(session.date)}
          </Button>
        ))}
      </div>

      {selected && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('courses.detail.enrolledTable.name')}</TableHead>
              <TableHead>{t('courses.detail.attendance.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseEnrollments.map((enrollment) => {
              const student = scopedStudents.find((s) => s.id === enrollment.studentId)
              if (!student) return null

              const existingRecord = ownAttendance.find(
                (a) =>
                  a.courseId === course.id &&
                  a.studentId === student.id &&
                  a.sessionDate === selected.date
              )
              const currentStatus = existingRecord?.status || 'absent'

              return (
                <TableRow key={student.id}>
                  <TableCell>
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(['present', 'absent', 'excused'] as const).map((status) => (
                        <Button
                          key={status}
                          variant={currentStatus === status ? 'default' : 'outline'}
                          size="sm"
                          disabled={markAttendance.isPending}
                          onClick={() => {
                            markAttendance.mutate({
                              courseId: course.id,
                              studentId: student.id,
                              sessionDate: selected.date,
                              status,
                            })
                          }}
                        >
                          {t(`attendance.list.status.${status}`)}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export function CoursesDetailPage() {
  const { t } = useTranslation()
  const { formatGrade, formatDate } = useFormat()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: enrolledCourse, isLoading: enrolledLoading } = useCourse(id ?? '')
  const currentRole = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)

  // The roster reads through the API/scope seam, never raw store collections
  // (ADR-0012, issue #166): admin sees all, the Course's Teacher sees their own
  // Course's records, and a Student's 'own' scope collapses this to self — their
  // single enrollment in this Course, or empty.
  const { data: courseEnrollments = [], isLoading: enrollmentsLoading } = useEnrollments({
    courseId: id ?? '',
  })

  // The current Student's own enrollment in this Course, derived from the scoped
  // read above rather than a raw store filter (issue #166). "Active" = approved or
  // pending; withdrawn/rejected are treated as not-enrolled for the
  // browse-vs-records decision (ADR-0016).
  const enrollment = currentUserId
    ? courseEnrollments.find((e) => e.studentId === currentUserId)
    : undefined
  const isActiveEnrollment = enrollment?.status === 'approved' || enrollment?.status === 'pending'

  const { data: browseableCourse, isLoading: browseLoading } = useBrowseableCourse(
    id ?? '',
    currentRole === 'student' && !isActiveEnrollment
  )
  // Seats remaining for the browse path, read through the data-layer aggregate
  // seam (issue #166): a Student's 'own' enrollment scope can't count others', so
  // the count is computed server-side and never exposes who is enrolled.
  const { data: seatsRemaining } = useCourseSeats(
    id ?? '',
    currentRole === 'student' && !isActiveEnrollment
  )
  const teachers = useStore((s) => s.teachers)
  const programs = useStore((s) => s.programs)
  const course = enrolledCourse ?? browseableCourse ?? null
  // Wait on the scoped enrollment query too: the browse-vs-records-vs-deny
  // decision below reads `enrollment`, so rendering before it resolves would
  // briefly mis-route an enrolled Student into the deny fallback (issue #166).
  const isLoading = enrolledLoading || browseLoading || enrollmentsLoading
  const { data: scopedStudents = [] } = useStudents()
  const { data: scopedTrainees = [] } = useTcuTrainees()
  const { data: scopedGrades = [] } = useGrades({ courseId: id ?? '' })
  const { data: ownAttendance = [] } = useAttendance({ courseId: id ?? '' })
  const unenroll = useUnenrollStudent()
  const markAttendance = useMarkAttendance()
  const requestEnrollment = useRequestEnrollment()
  const withdrawRequest = useWithdrawEnrollmentRequest()
  const closeCourse = useCloseCourse()

  const [gradingTarget, setGradingTarget] = useState<GradingTarget | null>(null)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [pendingUnenroll, setPendingUnenroll] = useState<{
    id: string
    studentName: string
  } | null>(null)
  const [selectedSessionDate, setSelectedSessionDate] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const canViewRoster = useCan('view', 'enrollments', { course: course || undefined })
  const canEdit = useCan('edit', 'courses')
  const canClose = useCan('close', 'courses', { course: course || undefined })
  const canCreate = useCan('create', 'enrollments')
  const canEnter = useCan('enter', 'grades', { course: course || undefined })
  const canEditGrade = useCan('edit', 'grades', { course: course || undefined })
  const canDelete = useCan('delete', 'enrollments')
  const canMark = useCan('mark', 'attendance', { course: course || undefined })

  if (isLoading)
    return <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>

  // isEnrolled: the student has an active (approved/pending) enrollment — they see
  // their self-only records (ADR-0012).
  const isEnrolled = isActiveEnrollment

  // isPending: student has a pending request for this course
  const isPending = enrollment?.status === 'pending'

  // isBrowseable: an open course the student is not actively enrolled in (ADR-0016).
  const isBrowseable = !!browseableCourse && !isActiveEnrollment

  // Seats left in the browseable Course, from the scoped seam. While the count
  // loads we show the full capacity so a transient "course full" never flashes.
  const seats = seatsRemaining ?? course?.capacity ?? 0

  if (!course) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('courses.detail.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app/courses">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  // Deny access if not viewing roster AND not enrolled AND not browseable (ADR-0012, ADR-0016)
  if (!canViewRoster && !isEnrolled && !isBrowseable) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('courses.detail.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app/courses">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  const teacher = teachers.find((tt) => tt.id === course.teacherId)
  const programName = programs.find((p) => p.id === course.programId)?.name ?? course.programId
  // Sessions are derived from Term × Meeting Days, never stored (ADR-0001).
  const sessions = sessionsFor(course)
  // Volunteers (TCU trainees) assigned to this Course, read through the scope seam.
  // Cross-check the One-Sede invariant (ADR-0011): a volunteer must share the
  // Course's Sede — a mismatch is a data violation and is dropped, never shown.
  const volunteers = scopedTrainees.filter(
    (tr) => tr.courseId === course.id && tr.sede === course.sede
  )
  // For the Student self-view: scope 'own' already narrows scopedGrades to the
  // current Student, so this is their own Grade for the Course (or undefined).
  const ownGrade = scopedGrades.find((g) => g.courseId === course.id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('courses.detail.title')}
        title={shortCourseName(course)}
        description={programName}
        action={
          <>
            <Button variant="outline" onClick={() => navigate('/app/courses')}>
              {t('common.actions.backToHome')}
            </Button>
            {canEdit && course.status !== 'closed' && (
              <Button onClick={() => navigate(`/app/courses?edit=${course.id}`)}>
                {t('courses.detail.edit')}
              </Button>
            )}
            {canClose && course.status === 'published' && (
              <Button variant="outline" onClick={() => setConfirmClose(true)}>
                {t('courses.detail.close')}
              </Button>
            )}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('courses.detail.sections.overview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.sede')}:</span>{' '}
              {course.sede}
            </p>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.programId')}:</span>{' '}
              {programName}
            </p>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.level')}:</span>{' '}
              {t(`courses.level.${course.level}`)}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('courses.form.fields.status')}:</span>
              <Badge variant={courseStatusVariant(course.status)} data-testid="course-status-badge">
                {t(`courses.status.${course.status}`)}
              </Badge>
            </div>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.capacity')}:</span>{' '}
              {course.capacity}
            </p>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.teacherId')}:</span>{' '}
              {teacher
                ? `${teacher.firstName} ${teacher.lastName}`
                : t('courses.detail.unassignedTeacher')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('courses.form.fields.description')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{course.description}</CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('courses.detail.sections.schedule')}
        </h2>
        {sessions.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t('courses.detail.sections.noSchedule')}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <li
                key={session.date}
                className="rounded-md border bg-card px-3 py-2 text-sm text-foreground"
              >
                {`${t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<
                  string,
                  string
                >)} · ${formatDate(session.date)}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canViewRoster && (
        <Fragment>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {t('courses.detail.sections.students')}
              </h2>
              {canCreate && (
                <Button size="sm" onClick={() => setEnrollOpen(true)}>
                  {t('courses.detail.enrollButton')}
                </Button>
              )}
            </div>
            {courseEnrollments.length === 0 ? (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('courses.detail.sections.noStudents')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('courses.detail.enrolledTable.name')}</TableHead>
                    <TableHead>{t('courses.detail.enrolledTable.grade')}</TableHead>
                    {(canEnter || canEditGrade || canDelete) && (
                      <TableHead className="text-right">
                        {t('courses.detail.enrolledTable.actions')}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseEnrollments.map((e) => {
                    const student = scopedStudents.find((s) => s.id === e.studentId)
                    const grade = scopedGrades.find(
                      (g) => g.studentId === e.studentId && g.courseId === course.id
                    )
                    if (!student) return null
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link to={`/app/students/${student.id}`} className="hover:underline">
                            {student.firstName} {student.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {grade
                            ? formatGrade(grade.score)
                            : t('courses.detail.enrolledTable.notGraded')}
                        </TableCell>
                        {(canEnter || canEditGrade || canDelete) && (
                          <TableCell className="text-right">
                            {(grade ? canEditGrade : canEnter) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setGradingTarget({
                                    studentId: student.id,
                                    studentName: `${student.firstName} ${student.lastName}`,
                                    initialScore: grade?.score,
                                  })
                                }
                              >
                                {t('courses.detail.enrolledTable.gradeButton')}
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPendingUnenroll({
                                    id: e.id,
                                    studentName: `${student.firstName} ${student.lastName}`,
                                  })
                                }
                              >
                                {t('courses.detail.enrolledTable.removeButton')}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('courses.detail.sections.volunteers')}
            </h2>
            {volunteers.length === 0 ? (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('courses.detail.sections.noVolunteers')}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {volunteers.map((volunteer) => (
                  <li
                    key={volunteer.id}
                    className="flex flex-col rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {volunteer.firstName} {volunteer.lastName}
                    </span>
                    {/* University is a Spanish proper noun, never passed through t() (ADR-0017). */}
                    <span className="text-muted-foreground">{volunteer.university}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canMark && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {t('courses.detail.sections.attendance')}
              </h2>
              <AttendanceMarkingSection
                course={course}
                courseEnrollments={courseEnrollments}
                scopedStudents={scopedStudents}
                selectedSessionDate={selectedSessionDate}
                onSessionSelect={setSelectedSessionDate}
                markAttendance={markAttendance}
                ownAttendance={ownAttendance}
              />
            </section>
          )}

          <CourseCertificatesSection course={course} />
        </Fragment>
      )}

      {!canViewRoster && isEnrolled && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('courses.detail.sections.yourRecords')}
          </h2>
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <p>
                <span className="text-muted-foreground">
                  {t('courses.detail.enrolledTable.grade')}:
                </span>{' '}
                {ownGrade
                  ? formatGrade(ownGrade.score)
                  : t('courses.detail.enrolledTable.notGraded')}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight">
              {t('courses.detail.sections.yourAttendance')}
            </h3>
            {ownAttendance.length === 0 ? (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('attendance.list.empty')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('attendance.list.columns.session')}</TableHead>
                    <TableHead>{t('attendance.list.columns.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownAttendance.map((record) => {
                    const session = findSession(course, record.sessionDate)
                    const sessionLabel = session
                      ? `${t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<string, string>)} · ${formatDate(record.sessionDate)}`
                      : formatDate(record.sessionDate)
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{sessionLabel}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(record.status)} dot>
                            {t(`attendance.list.status.${record.status}`)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      )}

      {!canViewRoster && isBrowseable && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('courses.browse.requestSection')}
          </h2>
          <Card>
            <CardContent className="space-y-4 py-4">
              <div className="grid gap-3 text-sm">
                <p>
                  <span className="text-muted-foreground">{t('courses.browse.seatsLabel')}:</span>{' '}
                  <span className="font-medium">
                    {seats}/{course.capacity}
                  </span>
                </p>
                {seats === 0 && (
                  <p className="text-sm text-destructive">
                    {t('courses.browse.courseFullWarning')}
                  </p>
                )}
              </div>
              <Button
                onClick={() => {
                  if (currentUserId) {
                    requestEnrollment.mutate({ studentId: currentUserId, courseId: course.id })
                  }
                }}
                disabled={requestEnrollment.isPending}
                className="w-full"
              >
                {t('courses.browse.requestButton')}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {!canViewRoster && isPending && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('courses.browse.pendingSection')}
          </h2>
          <Card>
            <CardContent className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('courses.browse.pendingStatus')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('courses.browse.pendingDescription')}
                  </p>
                </div>
                <Badge variant="outline">{t('enrollments.status.pending')}</Badge>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (enrollment) {
                    withdrawRequest.mutate(enrollment.id)
                  }
                }}
                disabled={withdrawRequest.isPending}
                className="w-full"
              >
                {t('courses.browse.withdrawButton')}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {gradingTarget && (
        <GradeDialog
          open
          onOpenChange={(v) => !v && setGradingTarget(null)}
          courseId={course.id}
          studentId={gradingTarget.studentId}
          studentName={gradingTarget.studentName}
          initialScore={gradingTarget.initialScore}
        />
      )}
      <EnrollStudentDialog open={enrollOpen} onOpenChange={setEnrollOpen} courseId={course.id} />

      <ConfirmDialog
        open={confirmClose}
        title={t('courses.detail.closeConfirm.title')}
        description={t('courses.detail.closeConfirm.description')}
        confirmLabel={t('courses.detail.close')}
        onConfirm={() => closeCourse.mutate({ courseId: course.id })}
        onOpenChange={(o) => {
          if (!o) setConfirmClose(false)
        }}
      />

      <ConfirmDialog
        open={pendingUnenroll !== null}
        title={t('common.confirmDelete.title')}
        description={
          pendingUnenroll
            ? t('courses.detail.enrolledTable.removeConfirm', {
                student: pendingUnenroll.studentName,
              })
            : undefined
        }
        confirmLabel={t('courses.detail.enrolledTable.removeButton')}
        destructive
        onConfirm={() => {
          if (pendingUnenroll) unenroll.mutate(pendingUnenroll.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingUnenroll(null)
        }}
      />
    </div>
  )
}
