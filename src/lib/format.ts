export type Locale = 'en' | 'es'

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
