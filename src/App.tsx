import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function App() {
  return (
    <main className="container mx-auto max-w-2xl py-12 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">FundaVida</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Scaffolding in progress. Domain modules arrive in later phases.
          </p>
          <Button asChild>
            <a href="https://github.com/rjwrld/FundaVida">View repository</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
