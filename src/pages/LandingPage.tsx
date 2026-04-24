import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { HeroScreenshot } from '@/components/landing/HeroScreenshot'
import { FeaturePreview } from '@/components/landing/FeaturePreview'
import { TechStack } from '@/components/landing/TechStack'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { useStore } from '@/data/store'
import { ROLES } from '@/constants/roles'
import type { Role } from '@/types'

export function LandingPage() {
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()
  const { t } = useTranslation()

  function enter(role: Role) {
    setRole(role)
    navigate('/app')
  }

  return (
    <main className="relative mx-auto max-w-5xl space-y-16 px-6 py-12">
      <div className="absolute right-6 top-6 flex items-center gap-1 rounded-md border bg-background/90 p-1 backdrop-blur">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <header className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4 text-center lg:text-left">
          <h1 className="text-4xl font-semibold tracking-tight">{t('landing.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('landing.hero.tagline')}</p>
          <div className="flex justify-center lg:justify-start">
            <Button size="lg" onClick={() => enter('admin')}>
              {t('landing.hero.cta')}
            </Button>
          </div>
        </div>
        <HeroScreenshot />
      </header>

      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="sr-only">
          {t('landing.rolesHeading')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <Card key={r.value}>
              <CardHeader>
                <CardTitle>{t(r.labelKey)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t(r.blurbKey)}</p>
                <Button onClick={() => enter(r.value)}>
                  {t('landing.enterAs', { role: t(r.labelKey) })}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FeaturePreview />
      <TechStack />
      <LandingFooter />
    </main>
  )
}
