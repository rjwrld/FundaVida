import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
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
    <main className="relative mx-auto max-w-4xl space-y-10 px-6 py-16">
      <div className="absolute right-6 top-6">
        <LanguageToggle variant="landing" />
      </div>
      <header className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t('landing.title')}</h1>
        <p className="text-muted-foreground">{t('landing.subtitle')}</p>
      </header>
      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="sr-only">
          {t('landing.rolesHeading')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
    </main>
  )
}
