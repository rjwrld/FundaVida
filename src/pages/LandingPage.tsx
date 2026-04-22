import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/data/store'
import { ROLES } from '@/constants/roles'
import type { Role } from '@/types'

export function LandingPage() {
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()

  function enter(role: Role) {
    setRole(role)
    navigate('/app')
  }

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-16">
      <header className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">FundaVida</h1>
        <p className="text-muted-foreground">
          Educational management platform demo. All data runs in your browser — pick a role to
          explore.
        </p>
      </header>
      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="sr-only">
          Choose a demo role
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <Card key={r.value}>
              <CardHeader>
                <CardTitle>{r.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{r.blurb}</p>
                <Button onClick={() => enter(r.value)}>Enter as {r.label}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
