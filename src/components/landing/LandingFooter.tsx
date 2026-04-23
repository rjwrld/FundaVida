import { useTranslation } from 'react-i18next'

export function LandingFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t pt-6">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{t('landing.footer.rearchitected', { org: 'FundaVida' })}</span>
        <a
          href="https://www.fundavida.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.org')}
        </a>
        <a
          href="https://github.com/rjwrld/FundaVida"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.github')}
        </a>
        <a
          href="https://www.linkedin.com/in/rjwrld/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.linkedin')}
        </a>
      </div>
    </footer>
  )
}
