import type { AttendanceRecord, Certificate, Course, Enrollment, Grade } from '@/types'

/**
 * A Student's roll-up for one enrolled Course (CONTEXT.md: **Student Progress**):
 * the Course, its Grade and Certificate if earned, and the attendance rate. A
 * derived view, never stored — the presentational `<StudentProgress>` renders it.
 */
export interface StudentProgressRow {
  enrollment: Enrollment
  course: Course
  /** The Student's Grade in this Course, or null when not yet graded. */
  grade: Grade | null
  /** The emitted Certificate for this Course, or null when none (ADR-0024). */
  certificate: Certificate | null
  /** present / total across this Course's attendance records; null when there are none. */
  attendanceRate: number | null
}

export interface StudentProgressInput {
  enrollments: Enrollment[]
  courses: Course[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  certificates: Certificate[]
}

/**
 * Join a Student's enrollments to their per-Course Grade, Certificate, and
 * attendance rate (ADR-0032). Pure and page-agnostic — the caller passes
 * already-scoped, resolved lists (never `[]` placeholders; the pages gate on
 * `resolveQueries` first, ADR-0030). An enrollment whose Course is absent from
 * `courses` is skipped, so a stale/out-of-scope courseId never crashes the row.
 * Enrollment order is preserved.
 */
export function buildStudentProgress({
  enrollments,
  courses,
  grades,
  attendance,
  certificates,
}: StudentProgressInput): StudentProgressRow[] {
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const gradeByCourse = new Map(grades.map((g) => [g.courseId, g]))
  const certByCourse = new Map(certificates.map((c) => [c.courseId, c]))
  const attendanceByCourse = new Map<string, { total: number; present: number }>()
  for (const record of attendance) {
    const bucket = attendanceByCourse.get(record.courseId) ?? { total: 0, present: 0 }
    bucket.total += 1
    if (record.status === 'present') bucket.present += 1
    attendanceByCourse.set(record.courseId, bucket)
  }

  const rows: StudentProgressRow[] = []
  for (const enrollment of enrollments) {
    const course = courseById.get(enrollment.courseId)
    if (!course) continue
    const bucket = attendanceByCourse.get(course.id)
    rows.push({
      enrollment,
      course,
      grade: gradeByCourse.get(course.id) ?? null,
      certificate: certByCourse.get(course.id) ?? null,
      attendanceRate: bucket ? bucket.present / bucket.total : null,
    })
  }
  return rows
}
