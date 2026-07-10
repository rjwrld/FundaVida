import { useTranslation } from 'react-i18next'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useStore } from '@/data/store'
import type { Locale } from '@/data/persistence'
import { cn } from '@/lib/utils'

type Variant = 'header' | 'landing'

/**
 * The EN/ES switch. `type="single"` is the honest ARIA for an exclusive choice,
 * so Radix renders a `radiogroup` of `radio`s (`aria-checked`) rather than the
 * hand-rolled `aria-pressed` buttons this replaces. `value` is always the store's
 * locale, so the group is controlled and a re-click can never deselect it.
 */
export function LanguageToggle({ variant = 'header' }: { variant?: Variant }) {
  const locale = useStore((s) => s.locale)
  const setLocale = useStore((s) => s.setLocale)
  const { t } = useTranslation()

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={locale}
      onValueChange={(next) => next && setLocale(next as Locale)}
      aria-label={t('common.language.label')}
      className={cn('text-xs', variant === 'landing' && 'bg-background/90 backdrop-blur-sm')}
    >
      {(['en', 'es'] as const).map((code) => (
        <ToggleGroupItem
          key={code}
          value={code}
          aria-label={code}
          className="px-2.5 font-medium uppercase tracking-wide"
        >
          {code}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
