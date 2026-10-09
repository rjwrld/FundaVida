import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useStore } from '@/data/store'
import { useRequestEnrollment } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { clock } from '@/lib/clock'
import { enrollmentRequestState } from '@/lib/enrollmentRequest'
import type { Course, Enrollment } from '@/types'

/**
 * One Browse row's Request action (ADR-0051): the same `request enrollments`
 * permission, the same {@link enrollmentRequestState} rule, and the same
 * `useRequestEnrollment` mutation — toast and write-set invalidation included —
 * as the Course page's Request button. Request → Requesting… → Requested; a
 * Course with no seats left reads Full.
 */
export function BrowseRequestAction({
  course,
  enrollment,
  seats,
}: {
  course: Course
  /** The Student's own enrollment in this Course, if any (their 'own' scope). */
  enrollment: Enrollment | undefined
  /** Seats left from the page's batched read; undefined while it loads. */
  seats: number | undefined
}) {
  const { t } = useTranslation()
  const currentUserId = useStore((s) => s.currentUserId)
  const canRequest = useCan('request', 'enrollments', { course })
  const requestEnrollment = useRequestEnrollment()

  const state = enrollmentRequestState(course, enrollment, clock.now())
  if (!canRequest || state === 'enrolled' || state === 'closed') return null

  // A request that just succeeded reads Requested at once, before the refetch
  // its invalidation triggers brings the pending record back.
  if (state === 'requested' || requestEnrollment.isSuccess) {
    return (
      <Button size="sm" variant="outline" disabled>
        {t('courses.browse.requested')}
      </Button>
    )
  }
  if (seats === 0) {
    return (
      <Button size="sm" variant="outline" disabled>
        {t('courses.browse.full')}
      </Button>
    )
  }
  return (
    <Button
      size="sm"
      variant="outline"
      // Held until the seats read lands, so a full Course never flashes Request.
      disabled={seats === undefined || requestEnrollment.isPending || !currentUserId}
      aria-label={t('courses.browse.requestAria', { course: course.name })}
      onClick={() => {
        if (currentUserId)
          requestEnrollment.mutate({ studentId: currentUserId, courseId: course.id })
      }}
    >
      {requestEnrollment.isPending ? t('courses.browse.requesting') : t('courses.browse.request')}
    </Button>
  )
}
