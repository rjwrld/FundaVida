import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { ROLES } from '@/constants/roles'
import { useStore } from '@/data/store'
import { landingPathForRole } from '@/lib/roleLanding'
import type { Role } from '@/types'

export function WelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setRole = useStore((s) => s.setRole)

  function choose(role: Role) {
    setRole(role)
    navigate(landingPathForRole(role, useStore.getState()))
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div className="absolute right-6 top-6 z-50 flex items-center gap-1 rounded-md border bg-background/90 p-1 backdrop-blur">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
        <WelcomeBanner
          eyebrow={t('welcome.eyebrow')}
          greeting={t('welcome.heading')}
          context={t('welcome.subtitle')}
          illustration={
            <img
              src="/illustrations/login-hero.svg"
              alt=""
              className="hidden h-44 w-auto sm:block sm:h-52"
            />
          }
        />

        <section aria-label={t('roleSwitcher.choose')} className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => choose(r.value)}
              className="group flex flex-col gap-1 rounded-lg border bg-card p-5 text-left transition-colors hover:border-brand-green-500 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-lg text-foreground">{t(r.labelKey)}</span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{t(r.blurbKey)}</span>
            </button>
          ))}
        </section>
      </div>
    </main>
  )
}
