import * as React from 'react'
import { cn } from '@/lib/utils'

export interface WelcomeBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  greeting: string
  context: string
  eyebrow?: string
  action?: React.ReactNode
  illustration?: React.ReactNode
  /**
   * Heading level for the greeting. Defaults to `2` for use alongside a page's
   * `PageHeader` <h1>; the standalone /welcome page passes `1` so the page has a
   * top-level heading of its own.
   */
  headingLevel?: 1 | 2
}

export function WelcomeBanner({
  greeting,
  context,
  eyebrow,
  action,
  illustration,
  headingLevel = 2,
  className,
  ...props
}: WelcomeBannerProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div
      className={cn(
        'relative min-h-[180px] overflow-hidden rounded-xl bg-card px-10 py-9',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary to-transparent to-40%"
      />
      <div className="relative z-10 flex max-w-xl flex-col gap-2">
        {eyebrow ? (
          <span className="text-[12px] font-medium uppercase tracking-wider text-primary">
            {eyebrow}
          </span>
        ) : null}
        <Heading className="font-display text-4xl font-normal tracking-normal text-foreground">
          {greeting}
        </Heading>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{context}</p>
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
      {illustration ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-5 -right-5 opacity-90"
        >
          {illustration}
        </div>
      ) : null}
    </div>
  )
}
