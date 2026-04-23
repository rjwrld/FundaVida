import { useStore } from '@/data/store'
import { formatDate, formatDateTime, formatNumber, formatPercent, formatGrade } from '@/lib/format'

export function useFormat() {
  const locale = useStore((s) => s.locale)
  return {
    locale,
    formatDate: (iso: string) => formatDate(iso, locale),
    formatDateTime: (iso: string) => formatDateTime(iso, locale),
    formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => formatNumber(n, locale, opts),
    formatPercent: (n: number) => formatPercent(n, locale),
    formatGrade: (n: number) => formatGrade(n, locale),
  }
}
