import { useTranslation } from 'react-i18next'
import { useStore } from '@/data/store'
import { cn } from '@/lib/utils'

type Variant = 'header' | 'landing'

export function LanguageToggle({ variant = 'header' }: { variant?: Variant }) {
  const locale = useStore((s) => s.locale)
  const setLocale = useStore((s) => s.setLocale)
  const { t } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('common.language.label')}
      className={cn(
        'inline-flex overflow-hidden rounded-md border text-xs',
        variant === 'landing' && 'bg-background/90 backdrop-blur'
      )}
    >
      {(['en', 'es'] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={cn(
            'px-2.5 py-1 font-medium uppercase tracking-wide transition-colors',
            locale === code
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
