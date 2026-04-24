import * as React from 'react'
import { cn } from '@/lib/utils'

export interface WelcomeBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  greeting: string
  context: string
  eyebrow?: string
  action?: React.ReactNode
  illustration?: React.ReactNode
}

export function WelcomeBanner({
  greeting,
  context,
  eyebrow,
  action,
  illustration,
  className,
  ...props
}: WelcomeBannerProps) {
  return (
    <div
      className={cn(
        'relative min-h-[180px] overflow-hidden rounded-xl px-10 py-9 shadow-card',
        'bg-[linear-gradient(135deg,oklch(var(--brand-green-50))_0%,oklch(var(--card))_40%,oklch(var(--card))_100%)]',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-green-500 to-transparent [--tw-gradient-to-position:40%]"
      />
      <span
        aria-hidden="true"
        className="absolute left-6 top-5 size-0.5 rounded-full bg-flame-yellow-500"
      />
      <span
        aria-hidden="true"
        className="absolute left-10 top-7 size-0.5 rounded-full bg-flame-yellow-500"
      />
      <div className="relative z-10 flex max-w-xl flex-col gap-2">
        {eyebrow ? (
          <span className="text-[12px] font-medium uppercase tracking-wider text-brand-green-700">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="font-display text-4xl font-normal tracking-normal text-foreground">
          {greeting}
        </h2>
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
