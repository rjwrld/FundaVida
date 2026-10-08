import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * An infinite horizontal scroll: two identical tracks slide left in lockstep,
 * so the second fills in behind the first for a seamless loop. Only the first
 * track is exposed to assistive tech; the copy is decorative (aria-hidden and
 * inert, so its contents are neither announced nor focusable).
 */
export function Marquee({
  children,
  reverse,
  pauseOnHover = true,
  paused = false,
  className,
}: {
  children: ReactNode
  reverse?: boolean
  pauseOnHover?: boolean
  /** Holds the scroll still — the page's pause control (WCAG 2.2.2). */
  paused?: boolean
  className?: string
}) {
  const track = cn(
    'marquee flex shrink-0 justify-around gap-(--gap) animate-[marquee_var(--duration)_linear_infinite]',
    pauseOnHover && 'group-hover:[animation-play-state:paused]',
    paused && '[animation-play-state:paused]',
    reverse && '[animation-direction:reverse]'
  )
  return (
    <div
      className={cn(
        'group flex gap-(--gap) overflow-hidden [--duration:20s] [--gap:1rem]',
        className
      )}
    >
      <div className={track}>{children}</div>
      <div className={track} aria-hidden="true" inert>
        {children}
      </div>
    </div>
  )
}
