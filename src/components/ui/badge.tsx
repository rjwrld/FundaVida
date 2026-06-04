import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-[oklch(0.64_0.21_25/0.4)] bg-[oklch(0.64_0.21_25/0.12)] text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.72_0.17_22)]',
        outline: 'border-border text-foreground',
        success:
          'border-[oklch(0.73_0.18_149/0.4)] bg-[oklch(0.73_0.18_149/0.14)] text-[oklch(0.52_0.16_149)] dark:text-[oklch(0.78_0.18_149)]',
        warning: 'border-border bg-muted text-foreground',
        info: 'border-border bg-transparent text-muted-foreground',
        neutral: 'border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </div>
  )
}

export { Badge }
// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants }
