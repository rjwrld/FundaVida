import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/brand/LogoMark'
import { cn } from '@/lib/utils'

/**
 * Brand lockup for the app chrome: the transparent four-people mark plus the "FundaVida"
 * wordmark as themed text (`text-foreground`), so it reads on both light and dark surfaces.
 * In the default `responsive` mode the wordmark text is hidden below `sm` (the app header
 * is cramped there); `always` keeps it visible for hosts with room, like the mobile drawer.
 * The link stays labelled for assistive tech either way. `onClick` lets a drawer host close
 * itself even when the link targets the current route (no pathname change to react to).
 */
export function BrandLockup({
  className,
  wordmark = 'responsive',
  onClick,
}: {
  className?: string
  wordmark?: 'responsive' | 'always'
  onClick?: () => void
}) {
  return (
    <Link
      to="/app"
      aria-label="FundaVida"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <LogoMark variant="mark" size="sm" alt="" />
      <span
        className={cn(
          'font-display text-lg font-semibold tracking-tight text-foreground',
          wordmark === 'responsive' && 'hidden sm:inline'
        )}
      >
        FundaVida
      </span>
    </Link>
  )
}
