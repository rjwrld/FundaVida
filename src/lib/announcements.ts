import type { SessionException } from '@/types'
import type { Locale } from '@/data/persistence'
import { formatDate } from './format'

/**
 * The body of an auto-posted `'sessionChange'` Announcement (ADR-0040), derived
 * from the session exception that triggered it (ADR-0039). The store has no
 * react-i18next runtime, so — unlike the English-only audit summary — this reads
 * the store's active `locale` and renders a finished bilingual sentence, frozen
 * at post time like any real announcement (a later locale switch does not rewrite
 * past posts). Dates go through the same `formatDate` the feed uses, so the body
 * and its timestamp read consistently.
 */
export function sessionChangeAnnouncementBody(locale: Locale, exception: SessionException): string {
  const on = (iso: string) => formatDate(iso, locale)
  if (locale === 'es') {
    switch (exception.type) {
      case 'cancelled':
        return `Se canceló la sesión del ${on(exception.date)}.`
      case 'rescheduled':
        return `La sesión del ${on(exception.date)} se trasladó al ${on(exception.newDate ?? exception.date)}.`
      case 'extra':
        return `Se agregó una sesión adicional el ${on(exception.date)}.`
    }
  }
  switch (exception.type) {
    case 'cancelled':
      return `The session on ${on(exception.date)} has been cancelled.`
    case 'rescheduled':
      return `The session on ${on(exception.date)} has been moved to ${on(exception.newDate ?? exception.date)}.`
    case 'extra':
      return `An extra session has been added on ${on(exception.date)}.`
  }
}
