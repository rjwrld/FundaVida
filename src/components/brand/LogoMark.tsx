import { cn } from '@/lib/utils'

export type LogoMarkVariant = 'full' | 'icon' | 'wordmark'

export interface LogoMarkProps {
  variant?: LogoMarkVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
}

export function LogoMark({ variant = 'full', size = 'md', className }: LogoMarkProps) {
  const src = variant === 'icon' ? '/favicon.svg' : '/logo.svg'
  return (
    <img
      src={src}
      alt="FundaVida"
      draggable={false}
      className={cn('w-auto', sizeClasses[size], className)}
    />
  )
}
