import { useTranslation } from 'react-i18next'
import { GithubMark } from './GithubMark'
import { LinkedinMark } from './LinkedinMark'
import { FOUNDATION_NAME } from './useRoleEntry'

/**
 * The landing footer (ADR-0049, issue #385): brand lockup + the "rearchitected
 * portfolio demo" provenance line, then the Source / LinkedIn / org links.
 */
export function LandingFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t">
      <div className="container mx-auto flex flex-col items-center gap-6 px-6 py-12 text-center lg:flex-row lg:justify-between lg:px-10 lg:text-left">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-black text-primary-foreground"
          >
            F
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t('landing.footer.rearchitected', { org: FOUNDATION_NAME })}
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.12em]">
          <a
            href="https://github.com/rjwrld/FundaVida"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubMark size={14} />
            {t('landing.footer.github')}
          </a>
          <a
            href="https://www.linkedin.com/in/rjwrld/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LinkedinMark size={14} />
            {t('landing.footer.linkedin')}
          </a>
          <a
            href="https://www.fundavida.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('landing.footer.org')}
          </a>
        </nav>
      </div>
    </footer>
  )
}
