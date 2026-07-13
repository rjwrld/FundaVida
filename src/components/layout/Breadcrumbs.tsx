import { Fragment, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { NAV_ITEMS } from '@/constants/nav'
import { cn } from '@/lib/utils'
import { useStudents, useTeachers, usePrograms, useCourses } from '@/hooks/api'
import { fullName } from '@/lib/personName'

interface Crumb {
  label: string
  to?: string
}

function navLabelForPath(path: string): string | null {
  const match = NAV_ITEMS.find((item) => item.to === path)
  return match ? match.labelKey : null
}

function rootLabelForFirstSegment(segment: string): string | null {
  const match = NAV_ITEMS.find((item) => item.to === `/app/${segment}`)
  return match ? match.labelKey : null
}

// Resolve a detail-route id segment (stu-/tea-/prog-/cou-) to a human-readable
// name. Reads go through the scoped list hooks, not the raw store, so the
// breadcrumb never names an entity the current role's scope would hide
// (ADR-0008/0012); an out-of-scope or still-loading id falls back to the raw id.
function useEntityNameResolver() {
  // React Query's `.data` references are stable between renders, so they keep the
  // useMemo deps stable (unlike `data ?? []`, which allocates a fresh array).
  const { data: students } = useStudents()
  const { data: teachers } = useTeachers()
  const { data: programs } = usePrograms()
  const { data: courses } = useCourses()

  return useMemo(
    () =>
      (id: string): string | null => {
        if (id.startsWith('stu-')) {
          const e = students?.find((x) => x.id === id)
          return e ? fullName(e) : null
        }
        if (id.startsWith('tea-')) {
          const e = teachers?.find((x) => x.id === id)
          return e ? fullName(e) : null
        }
        if (id.startsWith('prog-')) {
          return programs?.find((x) => x.id === id)?.name ?? null
        }
        if (id.startsWith('cou-')) {
          return courses?.find((x) => x.id === id)?.name ?? null
        }
        return null
      },
    [students, teachers, programs, courses]
  )
}

export function Breadcrumbs() {
  const location = useLocation()
  const { t } = useTranslation()
  const resolveEntityName = useEntityNameResolver()

  const crumbs = useMemo<Crumb[]>(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    if (segments.length === 0 || segments[0] !== 'app') return []

    const list: Crumb[] = [{ label: t('nav.dashboard'), to: '/app' }]

    if (segments.length === 1) return list

    const firstSegment = segments[1] ?? ''
    const rootKey = rootLabelForFirstSegment(firstSegment)
    if (rootKey) {
      list.push({ label: t(rootKey), to: `/app/${firstSegment}` })
    } else {
      list.push({ label: firstSegment, to: `/app/${firstSegment}` })
    }

    for (let i = 2; i < segments.length; i++) {
      const seg = segments[i] ?? ''
      const path = `/app/${segments.slice(1, i + 1).join('/')}`
      const navKey = navLabelForPath(path)
      if (navKey) {
        list.push({ label: t(navKey), to: path })
      } else if (seg === 'new') {
        list.push({ label: t('common.actions.new') })
      } else if (seg === 'edit') {
        list.push({ label: t('common.actions.edit') })
      } else {
        // dynamic segment (id) — resolve to the entity's name, falling back to
        // the raw id if it's out of scope or the list hasn't loaded yet.
        list.push({ label: resolveEntityName(seg) ?? seg })
      }
    }

    // Strip href from the last crumb so it's not a link
    const last = list[list.length - 1]
    if (last) {
      list[list.length - 1] = { label: last.label }
    }
    return list
  }, [location.pathname, t, resolveEntityName])

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb aria-label={t('common.a11y.breadcrumb')} className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1.5 sm:gap-1.5">
        {crumbs.map((crumb, idx) => (
          <Fragment key={`${crumb.label}-${idx}`}>
            {/* The block's header-slot pattern: below `md` only the current page
                shows — ancestors and their separators wait for the wider header. */}
            {idx > 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
            <BreadcrumbItem
              className={cn('min-w-0', idx < crumbs.length - 1 && 'hidden md:inline-flex')}
            >
              {crumb.to && idx < crumbs.length - 1 ? (
                <BreadcrumbLink asChild className="truncate">
                  <Link to={crumb.to}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                // `role="link"` is stripped: the current page is not a link, and
                // leaving it would add a second `getByRole('link')` match for the
                // page's own name — the nav item already owns that accessible name.
                <BreadcrumbPage role={undefined} className="truncate font-medium">
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
