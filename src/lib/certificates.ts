import type { Certificate, Course, Enrollment, Grade } from '@/types'

/** A Grade at or above this score earns a Certificate. */
export const PASSING_SCORE = 70

/** A score earns a Certificate when it meets the passing threshold. */
export function isPassingScore(score: number): boolean {
  return score >= PASSING_SCORE
}

/**
 * The PDF is available iff the Certificate exists (ADR-0024): closing the Course
 * is what emits it, so a Certificate that exists is always downloadable. Kept as
 * a named predicate so call sites read intentionally rather than asserting `true`.
 */
export function isCertificateDownloadable(_certificate: Certificate): boolean {
  return true
}

/** The student-scoped data a closing Course turns into a Certificate. */
export type CertificateSeed = Pick<Certificate, 'studentId' | 'courseId' | 'score'>

/**
 * The Certificates a Course earns when it closes (ADR-0024): one per Student with
 * an approved Enrollment in the Course AND a passing Grade, with the Grade's score
 * snapshotted. Failing or ungraded Students earn nothing. Pure — the caller stamps
 * each seed with an id and the close instant (`issuedAt`).
 */
export function emitCertificatesForClose(
  course: Pick<Course, 'id'>,
  enrollments: Enrollment[],
  grades: Grade[]
): CertificateSeed[] {
  const gradeByStudent = new Map(
    grades.filter((g) => g.courseId === course.id).map((g) => [g.studentId, g])
  )
  const seeds: CertificateSeed[] = []
  const seen = new Set<string>()
  for (const enrollment of enrollments) {
    if (enrollment.courseId !== course.id) continue
    if (enrollment.status !== 'approved') continue
    if (seen.has(enrollment.studentId)) continue
    const grade = gradeByStudent.get(enrollment.studentId)
    if (!grade || !isPassingScore(grade.score)) continue
    seen.add(enrollment.studentId)
    seeds.push({ studentId: enrollment.studentId, courseId: course.id, score: grade.score })
  }
  return seeds
}
