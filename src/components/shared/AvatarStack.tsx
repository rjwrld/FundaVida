import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface AvatarItem {
  src?: string
  fallback: string
  alt?: string
}

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: AvatarItem[]
  max?: number
  size?: 'sm' | 'md'
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
}

export function AvatarStack({
  avatars,
  max = 4,
  size = 'md',
  className,
  ...props
}: AvatarStackProps) {
  const safeMax = Math.max(1, max)
  const visible = avatars.slice(0, safeMax)
  const overflow = Math.max(0, avatars.length - visible.length)

  return (
    <div className={cn('flex items-center -space-x-2', className)} {...props}>
      {visible.map((avatar, i) => (
        <Avatar key={i} className={cn('ring-2 ring-card shadow-card', sizeClasses[size])}>
          {avatar.src ? <AvatarImage src={avatar.src} alt={avatar.alt ?? avatar.fallback} /> : null}
          <AvatarFallback className="bg-brand-green-100 text-brand-green-800">
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-card font-medium',
            sizeClasses[size]
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
