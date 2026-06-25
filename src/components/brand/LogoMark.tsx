import { cn } from '@/lib/utils'

export type LogoMarkVariant = 'full' | 'icon' | 'mark' | 'wordmark'

/**
 * `brand` keeps the mark's four-colour artwork (a plain <img>); `muted` tints the whole mark
 * to a single flat `currentColor` via a CSS mask, so it sits quietly beside muted text and
 * follows hover/theme like the surrounding copy. Only the transparent `mark` variant masks
 * cleanly — the others carry a white panel from logo.svg.
 */
export type LogoMarkTone = 'brand' | 'muted'

export interface LogoMarkProps {
  variant?: LogoMarkVariant
  size?: 'xs' | 'sm' | 'md' | 'lg'
  tone?: LogoMarkTone
  className?: string
  /** Image alt text. Pass "" when the mark is decorative (e.g. inside a labelled lockup). */
  alt?: string
}

const sizeClasses = {
  xs: 'h-4',
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
}

// `mark` is the transparent, wordmark-free four-people mark — the only variant that reads on
// both light and dark surfaces (`full`/`icon` carry a white background panel from logo.svg).
const srcByVariant: Record<LogoMarkVariant, string> = {
  full: '/logo.svg',
  wordmark: '/logo.svg',
  icon: '/favicon.svg',
  mark: '/logo-mark.svg',
}

export function LogoMark({
  variant = 'full',
  size = 'md',
  tone = 'brand',
  className,
  alt = 'FundaVida',
}: LogoMarkProps) {
  const src = srcByVariant[variant]

  if (tone === 'muted') {
    const decorative = alt === ''
    const maskUrl = `url(${src})`
    return (
      <span
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
        className={cn('inline-block aspect-square bg-current', sizeClasses[size], className)}
        style={{
          maskImage: maskUrl,
          WebkitMaskImage: maskUrl,
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
        }}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn('w-auto', sizeClasses[size], className)}
    />
  )
}
