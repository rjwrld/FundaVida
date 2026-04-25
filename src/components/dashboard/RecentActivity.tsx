import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { AuditLogEntry } from '@/types'

export interface RecentActivityProps {
  entries: AuditLogEntry[]
}

function initialsFor(input: string): string {
  const parts = input.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0] ?? ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1] ?? ''
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
}

export function RecentActivity({ entries }: RecentActivityProps) {
  const { t } = useTranslation()
  const { locale } = useFormat()
  const teachers = useStore((s) => s.teachers)
  const students = useStore((s) => s.students)
  const dfLocale = locale === 'es' ? es : enUS

  const resolveActor = (actorId: string): string => {
    if (actorId.startsWith('tea-')) {
      const teacher = teachers.find((teach) => teach.id === actorId)
      if (teacher) return `${teacher.firstName} ${teacher.lastName}`
    }
    if (actorId.startsWith('stu-')) {
      const student = students.find((s) => s.id === actorId)
      if (student) return `${student.firstName} ${student.lastName}`
    }
    if (actorId === 'admin') return t('dashboard.recentActivity.actor.admin')
    if (actorId === 'system') return t('dashboard.recentActivity.actor.system')
    return actorId
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">
          {t('dashboard.recentActivity.title')}
        </h3>
      </header>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.recentActivity.empty')}</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border/60">
          {entries.map((entry) => {
            const actor = resolveActor(entry.actorId)
            const initials = initialsFor(actor)
            const when = formatDistanceToNow(new Date(entry.timestamp), {
              addSuffix: true,
              locale: dfLocale,
            })
            return (
              <li key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-brand-green-100 text-[11px] font-medium text-brand-green-800">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{actor}</span>{' '}
                    <span className="text-muted-foreground">— {entry.summary}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{when}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
