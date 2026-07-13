import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useReducedMotion } from 'framer-motion'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { transitionGlide } from '@/lib/motion'
import { cn } from '@/lib/utils'

// ADR-0047 phase 6a local extension: the active indicator (default variant's
// pill, line variant's underline) is a framer `layoutId` span that glides
// between triggers. The root mirrors Radix's selected value into context so
// each trigger knows whether it owns the indicator; under
// prefers-reduced-motion the span is skipped and the stock static
// `data-[state=active]` styling takes over unchanged.
const TabsValueContext = React.createContext<{
  value: string | undefined
  layoutId: string
} | null>(null)

const TabsListVariantContext = React.createContext<'default' | 'line'>('default')

function Tabs({
  className,
  orientation = 'horizontal',
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  // Shadow Radix's selection state (controlled or not) for the indicator.
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const activeValue = value ?? internalValue
  const layoutId = React.useId()

  return (
    <TabsValueContext.Provider value={{ value: activeValue, layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        value={activeValue}
        onValueChange={(next) => {
          setInternalValue(next)
          onValueChange?.(next)
        }}
        className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
        {...props}
      />
    </TabsValueContext.Provider>
  )
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsListVariantContext.Provider value={variant ?? 'default'}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsListVariantContext.Provider>
  )
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const context = React.useContext(TabsValueContext)
  const variant = React.useContext(TabsListVariantContext)
  const reduce = useReducedMotion()
  const glide = context !== null && !reduce
  const showIndicator = glide && context.value === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'data-[state=active]:text-foreground dark:data-[state=active]:text-foreground',
        // The gliding span carries the active surface; the static classes are
        // the reduced-motion (and context-less) fallback.
        !glide && [
          'group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none',
          'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
          'data-[state=active]:bg-background dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30',
          'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
        ],
        className
      )}
      {...props}
    >
      {showIndicator && (
        <motion.span
          layoutId={context.layoutId}
          transition={transitionGlide}
          aria-hidden="true"
          data-slot="tabs-indicator"
          className={cn(
            'pointer-events-none absolute',
            variant === 'default' &&
              'inset-0 rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30',
            variant === 'line' &&
              'bg-foreground group-data-[orientation=horizontal]/tabs:inset-x-0 group-data-[orientation=horizontal]/tabs:bottom-[-5px] group-data-[orientation=horizontal]/tabs:h-0.5 group-data-[orientation=vertical]/tabs:inset-y-0 group-data-[orientation=vertical]/tabs:-right-1 group-data-[orientation=vertical]/tabs:w-0.5'
          )}
        />
      )}
      {/* `relative` lifts the label above the absolutely-positioned indicator. */}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
// eslint-disable-next-line react-refresh/only-export-components
export { tabsListVariants }
