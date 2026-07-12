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
        outline:
          'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
        // Local extension (ADR-0047): the status variants all wear the registry's
        // outline pill, and the hue lives in the dot below — never in the label.
        // The dot is aria-hidden, so it answers to the 3:1 non-text contrast
        // rule instead of 4.5:1, which is what lets `--success`/`--destructive`
        // be used raw here. Tinting the text instead is what forced the old
        // hand-tuned `text-[oklch(...)]` literals off the tokens.
        // `destructive` deliberately overrides its stock filled treatment: in
        // this app it is only ever a status (absent, rejected), never a chip.
        destructive: 'border-border bg-transparent text-foreground',
        success: 'border-border bg-transparent text-foreground',
        warning: 'border-border bg-transparent text-foreground',
        neutral: 'border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

// `--warning` and `--info` died with the blueprint skin (ADR-0047), so neither
// gets an amber dot; only success and destructive carry a hue. Warning still has
// to out-rank neutral, though — "Pending" sits next to "Withdrawn" in the
// enrollments list and only one of them is actionable — so it takes the solid
// foreground dot and the quiet states take the muted one.
//
// There is no `info` variant: it was byte-identical to `neutral` in both the
// pill and the dot, so it was a second name for the same pixels and an invitation
// to drift. Anything that used to be `info` is `neutral` (issue #332).
const badgeDotVariants = cva('size-1.5 shrink-0 rounded-full', {
  variants: {
    variant: {
      destructive: 'bg-destructive',
      success: 'bg-success',
      warning: 'bg-foreground',
      neutral: 'bg-muted-foreground',
    },
  },
})

const STATUS_VARIANTS = ['destructive', 'success', 'warning', 'neutral'] as const

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
type StatusVariant = (typeof STATUS_VARIANTS)[number]

function isStatusVariant(variant: BadgeVariant | null | undefined): variant is StatusVariant {
  return STATUS_VARIANTS.includes(variant as StatusVariant)
}

export interface BadgeProps
  extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant = 'default',
  asChild = false,
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
      {isStatusVariant(variant) ? (
        <span aria-hidden="true" data-slot="badge-dot" className={badgeDotVariants({ variant })} />
      ) : null}
      {children}
    </Comp>
  )
}

export { Badge }
// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants }
