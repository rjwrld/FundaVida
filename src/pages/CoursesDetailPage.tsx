import { useEffect, useMemo, useState, Fragment } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
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
  useStudents,
  useTcuTrainees,
  useUnenrollStudent,
  useRequestEnrollment,
  useWithdrawEnrollmentRequest,
  useSessionExceptions,
  useAnnouncements,
} from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { effectiveSessions, findSession } from '@/lib/sessions'
import { resolveQueries } from '@/lib/resolveQueries'
import { closeReadiness, isTermEnded, type CloseReadiness } from '@/lib/closeReadiness'
import { fadeUpHidden, transitionFast, transitionGlide } from '@/lib/motion'
import { isOpenForEnrollment, isLiveCohort } from '@/lib/courseDisplayState'
import { clock } from '@/lib/clock'
import { CloseReadinessChecklist } from '@/components/courses/CloseReadinessChecklist'
import { CourseSessionsSection } from '@/components/courses/CourseSessionsSection'
import { CourseAnnouncementsSection } from '@/components/courses/CourseAnnouncementsSection'
import { CourseSentMessagesSection } from '@/components/courses/CourseSentMessagesSection'
import { GradeDialog } from '@/components/courses/GradeDialog'
import { EnrollStudentDialog } from '@/components/courses/EnrollStudentDialog'
import { MessageClassDialog } from '@/components/courses/MessageClassDialog'
import { CourseCertificatesSection } from '@/components/courses/CourseCertificatesSection'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
import { shortCourseName } from '@/lib/courseName'
import { fullName } from '@/lib/personName'
import { ATTENDANCE_VARIANT } from '@/lib/statusVariant'

interface GradingTarget {
  studentId: string
  studentName: string
  initialScore?: number
}

export function CoursesDetailPage() {
  const { t } = useTranslation()
  const { formatGrade, formatDate } = useFormat()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const courseQuery = useCourse(id ?? '')
  const enrolledCourse = courseQuery.data
  const currentRole = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)

  // The roster reads through the API/scope seam, never raw store collections
  // (ADR-0012, issue #166): admin sees all, the Course's Teacher sees their own
  // Course's records, and a Student's 'own' scope collapses this to self — their
  // single enrollment in this Course, or empty.
  const enrollmentsQuery = useEnrollments({
    courseId: id ?? '',
  })
  const { data: courseEnrollments = [] } = enrollmentsQuery

  // The current Student's own enrollment in this Course, derived from the scoped
  // read above rather than a raw store filter (issue #166). "Active" = approved or
  // pending; withdrawn/rejected are treated as not-enrolled for the
  // browse-vs-records decision (ADR-0016).
  const enrollment = currentUserId
    ? courseEnrollments.find((e) => e.studentId === currentUserId)
    : undefined
  const isActiveEnrollment = enrollment?.status === 'approved' || enrollment?.status === 'pending'

  const browseableQuery = useBrowseableCourse(
    id ?? '',
    currentRole === 'student' && !isActiveEnrollment
  )
  const browseableCourse = browseableQuery.data
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
  // The browse query is conditionally disabled — resolveQueries gates on
  // isLoading, which a disabled query never sets, so it does not hang (ADR-0030).
  const { isPending: isLoading } = resolveQueries([courseQuery, browseableQuery, enrollmentsQuery])
  const { data: scopedStudents = [] } = useStudents()
  const { data: scopedTrainees = [] } = useTcuTrainees()
  const gradesQuery = useGrades({ courseId: id ?? '' })
  const attendanceQuery = useAttendance({ courseId: id ?? '' })
  const sessionExceptionsQuery = useSessionExceptions({ courseId: id ?? '' })
  const announcementsQuery = useAnnouncements({ courseId: id ?? '' })
  const { data: scopedGrades = [] } = gradesQuery
  const { data: ownAttendance = [] } = attendanceQuery
  const { data: sessionExceptions = [] } = sessionExceptionsQuery
  const { data: announcements = [] } = announcementsQuery
  const unenroll = useUnenrollStudent()
  const requestEnrollment = useRequestEnrollment()
  const withdrawRequest = useWithdrawEnrollmentRequest()
  const closeCourse = useCloseCourse()

  const [gradingTarget, setGradingTarget] = useState<GradingTarget | null>(null)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [pendingUnenroll, setPendingUnenroll] = useState<{
    id: string
    studentName: string
  } | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [messageClassOpen, setMessageClassOpen] = useState(false)

  // The close celebration window (ADR-0047 phase 6b): for a beat after the
  // close lands, the Close button stays mounted as a checkmark morph and the
  // readiness checklist replays as a cascade, then both exit. The readiness is
  // snapshotted at close time — the live derivation can flip to null once the
  // course stops being closable. Under reduced motion the window never opens
  // and the close re-renders instantly, exactly as before.
  const reduce = useReducedMotion()
  const [justClosed, setJustClosed] = useState(false)
  const [closedReadiness, setClosedReadiness] = useState<CloseReadiness | null>(null)
  useEffect(() => {
    if (!justClosed) return
    const timer = setTimeout(() => {
      setJustClosed(false)
      setClosedReadiness(null)
    }, 2400)
    return () => clearTimeout(timer)
  }, [justClosed])

  const canViewRoster = useCan('view', 'enrollments', { course: course || undefined })
  const canEdit = useCan('edit', 'courses')
  const canClose = useCan('close', 'courses', { course: course || undefined })
  const canCreate = useCan('create', 'enrollments')
  const canEnter = useCan('enter', 'grades', { course: course || undefined })
  const canEditGrade = useCan('edit', 'grades', { course: course || undefined })
  const canDelete = useCan('delete', 'enrollments')
  const canMark = useCan('mark', 'attendance', { course: course || undefined })
  // Cancel/reschedule/add Sessions ride the `edit courses` permission + ownership
  // (ADR-0039): the Course's own Teacher or admin, on a non-closed cohort.
  const canManageSessions =
    useCan('edit', 'courses', { course: course || undefined }) && isLiveCohort(course)
  // Compose/delete on the feed rides the announcements create permission
  // (teacher-own + admin, ADR-0040) and closes on a terminal cohort, mirroring the
  // Sessions manage gate. A scoped reader without it still sees the list.
  const canManageAnnouncements =
    useCan('create', 'announcements', { course: course || undefined }) && isLiveCohort(course)
  // "Message the class" opens the shared campaign compose locked to this Course
  // (ADR-0041): admin (unconditional) or the Course's own Teacher (courseOwned),
  // and never on a closed cohort — the store rejects a closed send, so a live
  // button beside a Finished badge would contradict itself (mirrors the Sessions
  // and Announcements manage gates).
  const canMessageClass =
    useCan('create', 'bulkEmail', { course: course || undefined }) && isLiveCohort(course)
  // The Course's outbox (ADR-0046). Same audience as the compose action minus its
  // lifecycle guard: reading what was already sent is safe on a closed cohort, and
  // the demo's one teacher-authored class message lives on exactly such a Course.
  const canViewSentMessages = useCan('view', 'bulkEmail', { course: course || undefined })

  // Close-readiness derivation (issue #204), from the page's existing scoped
  // queries. ONE closeReadiness derivation feeds both the close-readiness
  // checklist and the Sessions section's Needs-attendance queue (ADR-0037), so the
  // two verdicts agree by construction rather than by two calls that happen to
  // share inputs. Computed for anyone who consumes either verdict — the close
  // audience (canClose) or a marker (canMark) — and left null for everyone else.
  // Grades/attendance/enrollments resolve on their own timers, after the
  // page-level loading gate: deriving from their [] placeholders would flash a
  // false verdict (a Blocked checklist, or an all-past queue). resolveQueries owns
  // that loading guard (ADR-0030); until it resolves, both consumers hold.
  const readinessGate = resolveQueries([
    gradesQuery,
    attendanceQuery,
    enrollmentsQuery,
    sessionExceptionsQuery,
  ])
  const readiness = useMemo(() => {
    if (readinessGate.isPending) return null
    if (!course || (!canClose && !canMark)) return null
    return closeReadiness({
      course,
      enrollments: courseEnrollments,
      grades: scopedGrades,
      attendance: ownAttendance,
      sessionExceptions,
      now: clock.now(),
    })
  }, [
    course,
    canClose,
    canMark,
    courseEnrollments,
    scopedGrades,
    ownAttendance,
    sessionExceptions,
    readinessGate.isPending,
  ])

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
  // The close-readiness checklist shows only for the close audience on a
  // published, Term-ended Course; the Sessions queue (below) consumes the same
  // `readiness` object but surfaces for any marker, mid-Term gaps included.
  const showChecklist =
    !!readiness && canClose && course.status === 'published' && isTermEnded(course, clock.now())
  // During the celebration window the checklist renders from the close-time
  // snapshot; outside it, from the live derivation (or not at all).
  const checklistReadiness = justClosed ? closedReadiness : showChecklist ? readiness : null
  // Sessions are derived from Term × Meeting Days (ADR-0001), then the stored
  // exceptions overlay is applied last (ADR-0039) — one composed seam every
  // surface reads.
  const sessions = effectiveSessions(course, sessionExceptions)
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
            {canEdit && isLiveCohort(course) && (
              <Button onClick={() => navigate(`/app/courses?edit=${course.id}`)}>
                {t('courses.detail.edit')}
              </Button>
            )}
            <AnimatePresence>
              {canClose && (course.status === 'published' || justClosed) && (
                <motion.span
                  key="close-action"
                  layout={reduce ? false : true}
                  className="inline-flex"
                  exit={reduce ? undefined : fadeUpHidden}
                  transition={transitionFast}
                >
                  <Button
                    variant="outline"
                    disabled={justClosed}
                    // The morphed state swaps the accessible name with the icon:
                    // "Close course" is gone the instant the close lands.
                    aria-label={justClosed ? t('courses.detail.closed') : undefined}
                    onClick={() => setConfirmClose(true)}
                  >
                    {justClosed ? (
                      <motion.span
                        className="inline-flex"
                        initial={{ scale: 0.3, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={transitionGlide}
                      >
                        <Check aria-hidden="true" />
                      </motion.span>
                    ) : (
                      t('courses.detail.close')
                    )}
                  </Button>
                </motion.span>
              )}
            </AnimatePresence>
            {canMessageClass && (
              <Button variant="outline" onClick={() => setMessageClassOpen(true)}>
                {t('courses.detail.messageClass')}
              </Button>
            )}
          </>
        }
      />

      <AnimatePresence>
        {checklistReadiness && (
          <motion.div
            key="close-readiness"
            exit={reduce ? undefined : fadeUpHidden}
            transition={transitionFast}
          >
            <CloseReadinessChecklist readiness={checklistReadiness} celebrate={justClosed} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The outbox sits directly under the header that carries "Message the class"
          (ADR-0046), so compose and sent history read as one channel. The
          close-readiness banner stays topmost: it is a call to act, not a record. */}
      {canViewSentMessages && <CourseSentMessagesSection course={course} />}

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
              <CourseStateBadge course={course} data-testid="course-status-badge" />
            </div>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.capacity')}:</span>{' '}
              {course.capacity}
            </p>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.teacherId')}:</span>{' '}
              {teacher ? fullName(teacher) : t('courses.detail.unassignedTeacher')}
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

      <CourseSessionsSection
        course={course}
        sessions={sessions}
        today={clock.today()}
        canMark={canMark}
        readiness={readiness}
        attendance={ownAttendance}
        enrolledCount={courseEnrollments.length}
        canManageSessions={canManageSessions}
      />

      {/* The feed is visible to every scoped role with access to this Course — the
          roster audience (teacher/admin) and enrolled Students (ADR-0040). A
          browsing, not-yet-enrolled Student has no feed scope, so it stays hidden. */}
      {(canViewRoster || isEnrolled) && (
        <CourseAnnouncementsSection
          course={course}
          announcements={announcements}
          canManage={canManageAnnouncements}
          isLoading={announcementsQuery.isPending}
        />
      )}

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
              <NoResults message={t('courses.detail.sections.noStudents')} />
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
                            {fullName(student)}
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
                                    studentName: fullName(student),
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
                                    studentName: fullName(student),
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
              <NoResults message={t('courses.detail.sections.noVolunteers')} />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {volunteers.map((volunteer) => (
                  <li
                    key={volunteer.id}
                    className="flex flex-col rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">{fullName(volunteer)}</span>
                    {/* University is a Spanish proper noun, never passed through t() (ADR-0017). */}
                    <span className="text-muted-foreground">{volunteer.university}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
              <NoResults message={t('attendance.list.empty')} />
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
                          <Badge variant={ATTENDANCE_VARIANT[record.status]}>
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

      {/* The request surface hides once the Term has ended (ADR-0042): the store
          rejects the mutation, so a live button beside a "Term ended" badge would
          contradict itself. The course stays viewable (badge visible) — only the
          request action drops. */}
      {!canViewRoster && isBrowseable && isOpenForEnrollment(course, clock.now()) && (
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
      {canMessageClass && (
        <MessageClassDialog
          open={messageClassOpen}
          onOpenChange={setMessageClassOpen}
          course={course}
        />
      )}

      <ConfirmDialog
        open={confirmClose}
        title={t('courses.detail.closeConfirm.title')}
        description={t('courses.detail.closeConfirm.description')}
        confirmLabel={t('courses.detail.close')}
        onConfirm={() =>
          closeCourse.mutate(
            { courseId: course.id },
            {
              onSuccess: () => {
                if (reduce) return
                setJustClosed(true)
                // Celebrate the checklist only if it was on screen for the close.
                setClosedReadiness(showChecklist ? readiness : null)
              },
            }
          )
        }
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
