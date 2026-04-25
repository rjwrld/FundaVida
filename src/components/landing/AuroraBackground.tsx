import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AuroraBackground({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="aurora pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 0%, oklch(var(--brand-green-300)) 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 80% 20%, oklch(var(--brand-blue-300)) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 80%, oklch(var(--flame-yellow-200)) 0%, transparent 60%)',
          animation: 'aurora-drift 20s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  )
}
