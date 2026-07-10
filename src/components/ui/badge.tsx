import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        // Local extension (ADR-0047): status variants for domain badges.
        // border/bg derive from the shared --destructive/--success tokens (so the
        // tint tracks the theme); the text shades stay hand-tuned literals to hold
        // AA contrast on the low-alpha tint. Restyle to the stock outline+dot look
        // is scoped to #304, not here.
        destructive:
          // Text darkened 0.55→0.5 for the fundavida-green theme: its stock
          // --destructive tints the /12 bg deeper than the old token, and 0.55
          // lands at 4.33:1 there (axe AA fails at <4.5).
          'border-destructive/40 bg-destructive/12 text-[oklch(0.5_0.2_25)] dark:text-[oklch(0.72_0.17_22)]',
        outline:
          'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
        success:
          'border-success/40 bg-success/14 text-[oklch(0.5_0.16_138)] dark:text-[oklch(0.78_0.14_138)]',
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

// Local extension (ADR-0047): `dot` renders a leading status dot in the
// variant's text color; several list pages pair it with the status variants.
export interface BadgeProps
  extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean
  dot?: boolean
}

function Badge({
  className,
  variant = 'default',
  asChild = false,
  dot,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </Comp>
  )
}

export { Badge }
// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants }
