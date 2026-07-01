import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import { parseISO } from 'date-fns'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useCourses, useEnrollments, useMarkSessionAttendance, useStudents } from '@/hooks/api'
import { sessionsFor } from '@/lib/sessions'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'
import { can } from '@/permissions'
import { useStore } from '@/data/store'
import type { AttendanceRecord } from '@/types'

export function MarkSessionAttendancePage() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const navigate = useNavigate()
  const { courseId, sessionDate } = useParams<{ courseId: string; sessionDate: string }>()

  const { data: courses = [], isLoading: coursesLoading } = useCourses()
  const { data: students = [], isLoading: studentsLoading } = useStudents()
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments()
  const markSessionMutation = useMarkSessionAttendance()

  const isLoading = coursesLoading || studentsLoading || enrollmentsLoading

  // Compute page state from params and data
  const { course, session, sessions, isMarkable, enrolledStudents, isValid, error } =
    useMemo(() => {
      // Validation: course and session date must be provided
      if (!courseId || !sessionDate) {
        return {
          course: null,
          session: null,
          sessions: [],
          isMarkable: false,
          enrolledStudents: [],
          isValid: false,
          error: 'Invalid parameters',
        }
      }

      const foundCourse = courses.find((c) => c.id === courseId)
      if (!foundCourse) {
        return {
          course: null,
          session: null,
          sessions: [],
          isMarkable: false,
          enrolledStudents: [],
          isValid: false,
          error: 'Course not found',
        }
      }

      // Find the session
      const allSessions = sessionsFor(foundCourse)
      const foundSession = allSessions.find(
        (s) => new Date(s.date).toISOString() === new Date(sessionDate).toISOString()
      )

      if (!foundSession) {
        return {
          course: foundCourse,
          session: null,
          sessions: allSessions,
          isMarkable: false,
          enrolledStudents: [],
          isValid: false,
          error: 'Session not found',
        }
      }

      // Check if session is markable (on or before today)
      const sessionDateObj = parseISO(foundSession.date)
      const today = clock.today()
      const markable = sessionDateObj <= today

      if (!markable) {
        return {
          course: foundCourse,
          session: foundSession,
          sessions: allSessions,
          isMarkable: false,
          enrolledStudents: [],
          isValid: true,
          error: 'Session is in the future',
        }
      }

      // Get enrolled students for this course
      const courseEnrollments = enrollments.filter((e) => e.courseId === courseId)
      const students_ = courseEnrollments
        .map((e) => {
          const student = students.find((s) => s.id === e.studentId)
          return student ? { ...student } : null
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (!a || !b) return 0
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        })

      return {
        course: foundCourse,
        session: foundSession,
        sessions: allSessions,
        isMarkable: true,
        enrolledStudents: students_.filter(Boolean),
        isValid: true,
        error: null,
      }
    }, [courseId, sessionDate, courses, enrollments, students])

  // Whether the current role may mark THIS course's attendance, derived from the
  // matrix with course context (ADR-0010): admin always, the owning teacher via
  // the courseOwned predicate, students/other teachers never.
  const role = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)
  const canMark = useMemo(
    () =>
      role && course
        ? can(role, 'mark', 'attendance', { userId: currentUserId ?? undefined, course })
        : false,
    [role, currentUserId, course]
  )

  // Initialize attendance state: all students default to present
  const [attendanceByStudentId, setAttendanceByStudentId] = useState<
    Record<string, AttendanceRecord['status']>
  >(() => {
    const initial: Record<string, AttendanceRecord['status']> = {}
    for (const student of enrolledStudents) {
      if (student) {
        initial[student.id] = 'present'
      }
    }
    return initial
  })

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendanceByStudentId((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSave = async () => {
    if (!session || !course) return
    try {
      await markSessionMutation.mutateAsync({
        courseId: course.id,
        sessionDate: session.date,
        attendanceByStudentId,
      })
      // Navigate back to the calendar
      navigate('/app/calendar')
    } catch {
      // Error is handled by the mutation's onError handler (toast)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  // Permission guard (ADR-0010/0018): only a role allowed to mark THIS course's
  // attendance may reach the marking route; students and non-owning teachers are
  // redirected. The store mutation remains the real boundary (ADR-0009).
  if (!isLoading && course && !canMark) {
    return <Navigate to="/app" replace />
  }

  // Rendering: validation errors
  if (!isValid) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('attendance.mark.title')} />
        <div className="text-center text-destructive">{error}</div>
      </div>
    )
  }

  // Rendering: future session (read-only)
  if (!isMarkable && session && course) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-foreground">{course.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('attendance.mark.sessionNumber', {
              ordinal: String(session.ordinal),
              total: String(sessions.length),
            } as Record<string, string>)}
          </p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200">
          {t('attendance.mark.future')}
        </div>
      </div>
    )
  }

  // Rendering: loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('attendance.mark.title')} />
        <SkeletonTable />
      </div>
    )
  }

  // Rendering: no students
  if (enrolledStudents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('attendance.mark.title')}
          description={t('attendance.mark.subtitle')}
        />
        <div className="text-center text-muted-foreground">{t('attendance.mark.empty')}</div>
      </div>
    )
  }

  // Rendering: normal case (ready to mark)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">{course?.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('attendance.mark.sessionNumber', {
            ordinal: String(session?.ordinal),
            total: String(sessions.length),
          } as Record<string, string>)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{formatDate(session?.date ?? '')}</p>
      </div>

      <p className="text-sm text-muted-foreground">{t('attendance.mark.subtitle')}</p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('attendance.mark.studentNameColumn')}</TableHead>
              <TableHead className="text-right">{t('attendance.mark.status.present')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrolledStudents.map((student) => {
              if (!student) return null
              return (
                <TableRow key={student.id}>
                  <TableCell>
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={attendanceByStudentId[student.id]}
                      onValueChange={(value) =>
                        handleStatusChange(student.id, value as AttendanceRecord['status'])
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">
                          {t('attendance.mark.status.present')}
                        </SelectItem>
                        <SelectItem value="absent">{t('attendance.mark.status.absent')}</SelectItem>
                        <SelectItem value="excused">
                          {t('attendance.mark.status.excused')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={markSessionMutation.isPending} variant="default">
          {t('attendance.mark.save')}
        </Button>
        <Button onClick={handleCancel} disabled={markSessionMutation.isPending} variant="outline">
          {t('attendance.mark.cancel')}
        </Button>
      </div>
    </div>
  )
}
