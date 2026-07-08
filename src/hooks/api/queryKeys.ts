/**
 * The canonical React Query list-key prefix for each entity — the single source
 * of truth shared by the read hooks (which build their query keys from these) and
 * `SLICE_TO_KEYS` (which maps store writes to the keys they invalidate). Keeping
 * both sides on one constant means a prefix rename can't desync a reader from its
 * invalidator, the drift class ADR-0029 exists to eliminate.
 *
 * This is a dependency-free leaf: it imports nothing local, so entity hooks and
 * `invalidation.ts` can both import it without an import cycle.
 */
export const PROGRAMS_KEY = ['programs'] as const
export const STUDENTS_KEY = ['students'] as const
export const TEACHERS_KEY = ['teachers'] as const
export const COURSES_KEY = ['courses'] as const
export const ENROLLMENTS_KEY = ['enrollments'] as const
export const GRADES_KEY = ['grades'] as const
export const CERTIFICATES_KEY = ['certificates'] as const
export const TRAINEES_KEY = ['trainees'] as const
export const TCU_KEY = ['tcu'] as const
export const ATTENDANCE_KEY = ['attendance'] as const
export const SESSION_EXCEPTIONS_KEY = ['sessionExceptions'] as const
export const AUDIT_LOG_KEY = ['auditLog'] as const
export const EMAIL_CAMPAIGNS_KEY = ['emailCampaigns'] as const
