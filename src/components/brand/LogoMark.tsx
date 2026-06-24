import { cn } from '@/lib/utils'

export type LogoMarkVariant = 'full' | 'icon' | 'mark' | 'wordmark'

export interface LogoMarkProps {
  variant?: LogoMarkVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Image alt text. Pass "" when the mark is decorative (e.g. inside a labelled lockup). */
  alt?: string
}

const sizeClasses = {
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
  className,
  alt = 'FundaVida',
}: LogoMarkProps) {
  return (
    <img
      src={srcByVariant[variant]}
      alt={alt}
      draggable={false}
      className={cn('w-auto', sizeClasses[size], className)}
    />
  )
}
