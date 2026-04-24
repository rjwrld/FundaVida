import { Fragment, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/nav'

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

export function Breadcrumbs() {
  const location = useLocation()
  const { t } = useTranslation()

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
        // dynamic segment (id) — display raw, no link
        list.push({ label: seg })
      }
    }

    // Strip href from the last crumb so it's not a link
    const last = list[list.length - 1]
    if (last) {
      list[list.length - 1] = { label: last.label }
    }
    return list
  }, [location.pathname, t])

  if (crumbs.length === 0) return null

  return (
    <nav
      aria-label={t('common.a11y.breadcrumb')}
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      {crumbs.map((crumb, idx) => (
        <Fragment key={`${crumb.label}-${idx}`}>
          {idx > 0 ? (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
          ) : null}
          {crumb.to && idx < crumbs.length - 1 ? (
            <Link
              to={crumb.to}
              className="truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate font-medium text-foreground">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
