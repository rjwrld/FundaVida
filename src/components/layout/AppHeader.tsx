import { Link } from 'react-router-dom'

export function AppHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="font-semibold tracking-tight">
          FundaVida
        </Link>
        <nav aria-label="Primary" className="text-sm text-muted-foreground">
          <span>Demo</span>
        </nav>
      </div>
    </header>
  )
}
