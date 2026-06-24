import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/brand/LogoMark'
import { cn } from '@/lib/utils'

/**
 * Brand lockup for the app chrome: the transparent four-people mark plus the "FundaVida"
 * wordmark as themed text (`text-foreground`), so it reads on both light and dark surfaces.
 * The wordmark text is hidden below `sm`; the link stays labelled for assistive tech.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <Link
      to="/app"
      aria-label="FundaVida"
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <LogoMark variant="mark" size="sm" alt="" />
      <span className="hidden font-display text-lg font-semibold tracking-tight text-foreground sm:inline">
        FundaVida
      </span>
    </Link>
  )
}
