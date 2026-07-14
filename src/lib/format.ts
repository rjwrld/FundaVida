import type { Locale } from '@/data/persistence'
export type { Locale }

// es-CR: Costa Rican Spanish — period thousands-separator (12.345), matches the project's domain.
const localeTag: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-CR',
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Month + day, no year — the month term map's milestone rows ("starts Jul 6"),
 * which sit under a caption already naming the year (ADR-0048). Intl orders the
 * parts per locale, so `es-CR` reads "6 jul" rather than an anglicized "jul 6".
 */
export function formatDayMonth(iso: string, locale: Locale): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(localeTag[locale], {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatNumber(n: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeTag[locale], opts).format(n)
}

export function formatPercent(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(n)
}

export function formatGrade(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n)
}
