import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-4xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">We couldn&apos;t find that page.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}
