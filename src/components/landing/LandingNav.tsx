import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useStore } from '@/data/store'
import { GithubMark } from './GithubMark'

/**
 * The landing's real nav (ADR-0049): brand lockup, the two toggles, GitHub,
 * and the "Open app" pill — the admin fast path, one of the two explicit
 * admin CTAs allowed to hard-code setRole('admin'). No fictional links.
 */
export function LandingNav() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setRole = useStore((s) => s.setRole)

  const openApp = () => {
    setRole('admin')
    navigate('/app')
  }

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-6 lg:px-10">
        <span className="flex items-center gap-2.5 font-display text-base font-extrabold tracking-tight">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg bg-primary font-black text-primary-foreground"
          >
            F
          </span>
          <span className="max-sm:sr-only">FundaVida</span>
        </span>
        <div className="flex items-center gap-1.5">
          <LanguageToggle variant="landing" />
          <ThemeToggle />
          <a
            href="https://github.com/rjwrld/FundaVida"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            <GithubMark size={14} />
            {t('landing.nav.github')}
          </a>
          <button
            type="button"
            onClick={openApp}
            className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition-transform hover:-translate-y-px"
          >
            {t('landing.nav.openApp')}
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  )
}
