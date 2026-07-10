import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
import { useCourses } from '@/hooks/api/courses'
import { shortCourseName } from '@/lib/courseName'

/**
 * The Teacher's own Courses with their derived display-state badges (ADR-0042/
 * 0043): a compact roster linking each Course to its detail page. Reads the
 * role-scoped {@link useCourses} query (`courses: 'own'`), so it never touches the
 * raw store and shows exactly the Teacher's cohorts.
 */
export function OwnCoursesList() {
  const { t } = useTranslation()
  const { data: courses, isLoading } = useCourses()

  if (isLoading || !courses) {
    return <SkeletonCard lines={4} data-testid="own-courses-list" />
  }

  return (
    <Card className="h-full" data-testid="own-courses-list">
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <BookOpen
            className="size-4 text-brand-green-700 dark:text-brand-green-300"
            aria-hidden="true"
          />
          {t('dashboard.teacher.ownCourses.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.teacher.ownCourses.empty')}</p>
        ) : (
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {courses.map((course) => (
              <li key={course.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={`/app/courses/${course.id}`}
                  className="group flex items-center justify-between gap-3 rounded-md py-1"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-brand-green-700 dark:group-hover:text-brand-green-300 group-hover:underline">
                    {shortCourseName(course)}
                  </span>
                  <CourseStateBadge course={course} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
