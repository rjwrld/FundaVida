import { Link } from 'react-router-dom'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'

export function AppHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/app" className="font-semibold tracking-tight">
          FundaVida
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary" className="text-sm text-muted-foreground">
            <span>Demo</span>
          </nav>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  )
}
