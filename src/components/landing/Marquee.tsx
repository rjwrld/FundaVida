import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Marquee({
  children,
  reverse,
  pauseOnHover = true,
  className,
}: {
  children: ReactNode
  reverse?: boolean
  pauseOnHover?: boolean
  className?: string
}) {
  return (
    <div className={cn('group flex overflow-hidden [--duration:20s] [--gap:1rem]', className)}>
      <div
        className={cn(
          'marquee flex shrink-0 justify-around gap-[--gap] [animation:marquee_var(--duration)_linear_infinite]',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]'
        )}
      >
        {children}
        {children}
      </div>
    </div>
  )
}
