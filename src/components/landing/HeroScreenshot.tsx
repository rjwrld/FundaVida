import { useTranslation } from 'react-i18next'

export function HeroScreenshot() {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <img
        src="/screenshots/hero.en.png"
        alt={t('landing.hero.screenshotAlt')}
        width={1440}
        height={900}
        loading="eager"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  )
}
