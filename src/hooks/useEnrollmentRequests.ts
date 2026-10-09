import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DataTableColumn } from '@/components/ui/data-table'
import {
  useApproveEnrollment,
  useCourses,
  useEnrollments,
  useRejectEnrollment,
  useStudents,
} from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { fullName } from '@/lib/personName'
import { resolveQueries } from '@/lib/resolveQueries'
import type { Course, Enrollment } from '@/types'

/** One enrollment joined to the names a request row shows. */
export interface EnrollmentRow {
  id: string
  enrollment: Enrollment
  studentName: string
  course: Course | undefined
  courseName: string
  /** Approving would exceed the Course's capacity (ADR-0016). */
  isAtCapacity: boolean
}

/**
 * Every scoped enrollment as a request row, oldest request first (FIFO) — the
 * one join both the approval queue card and the Enrollments page read, so the two
 * can never disagree about a row. Every read rides the scope seam (ADR-0008): a
 * Teacher's enrollments, students, and Courses are their own Courses'; an admin's
 * are all. Rows join all three, so they gate on all three (ADR-0030) and stay
 * `null` until every read resolves.
 */
export function useEnrollmentRows(): EnrollmentRow[] | null {
  const { t } = useTranslation()
  const enrollmentsQuery = useEnrollments({})
  const studentsQuery = useStudents()
  const coursesQuery = useCourses()
  const gate = resolveQueries([enrollmentsQuery, studentsQuery, coursesQuery])
  const ready = !gate.isPending

  // The join indexes two lists and sorts every enrollment, so it reruns only
  // when a read hands back new data — React Query keeps `.data` referentially
  // stable between renders — and callers' own memos over the rows can hit.
  const enrollments = enrollmentsQuery.data
  const students = studentsQuery.data
  const courses = coursesQuery.data
  return useMemo(() => {
    if (!ready || !enrollments || !students || !courses) return null
    const studentById = new Map(students.map((s) => [s.id, s]))
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const approvedByCourse = new Map<string, number>()
    for (const e of enrollments) {
      if (e.status === 'approved') {
        approvedByCourse.set(e.courseId, (approvedByCourse.get(e.courseId) ?? 0) + 1)
      }
    }

    return [...enrollments]
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))
      .map((enrollment) => {
        const student = studentById.get(enrollment.studentId)
        const course = courseById.get(enrollment.courseId)
        return {
          id: enrollment.id,
          enrollment,
          studentName: student ? fullName(student) : t('enrollments.list.unknownStudent'),
          course,
          courseName: course?.name ?? '',
          isAtCapacity: Boolean(
            course && (approvedByCourse.get(course.id) ?? 0) >= course.capacity
          ),
        }
      })
  }, [ready, enrollments, students, courses, t])
}

/**
 * The Student · Course · Requested columns every request table opens with;
 * `includeSede` adds Campus after Course for a view spanning every Sede (the
 * admin's Enrollments page).
 */
export function useEnrollmentRequestColumns({
  includeSede = false,
}: { includeSede?: boolean } = {}): DataTableColumn<EnrollmentRow>[] {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  return [
    { id: 'student', header: t('enrollments.list.columns.student'), cell: (r) => r.studentName },
    { id: 'course', header: t('enrollments.list.columns.course'), cell: (r) => r.courseName },
    ...(includeSede
      ? [
          {
            id: 'sede',
            header: t('courses.form.fields.sede'),
            cell: (r: EnrollmentRow) => r.course?.sede ?? '',
          },
        ]
      : []),
    {
      id: 'requested',
      header: t('enrollments.list.columns.requested'),
      cell: (r) => formatDate(r.enrollment.requestedAt),
    },
  ]
}

/**
 * The approve/reject mutations a request table decides with — one pair per table,
 * so a pending decision disables every row's buttons, not just its own.
 */
export function useEnrollmentDecisions() {
  return { approve: useApproveEnrollment(), reject: useRejectEnrollment() }
}
