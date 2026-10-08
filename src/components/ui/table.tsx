import * as React from 'react'

import { cn } from '@/lib/utils'

// Tracks whether the table overflows its container and where the scroll sits,
// so a clipped table can say so: an edge fade marks the hidden side, and the
// container joins the tab order (keyboard users can scroll it; WCAG 2.1.1).
function useScrollEdges(ref: React.RefObject<HTMLDivElement | null>) {
  const [edges, setEdges] = React.useState({ overflowing: false, atStart: true, atEnd: true })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const overflowing = el.scrollWidth > el.clientWidth + 1
      const atStart = el.scrollLeft <= 1
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setEdges((prev) =>
        prev.overflowing === overflowing && prev.atStart === atStart && prev.atEnd === atEnd
          ? prev
          : { overflowing, atStart, atEnd }
      )
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    if (el.firstElementChild) observer?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [ref])

  return edges
}

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { overflowing, atStart, atEnd } = useScrollEdges(containerRef)

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      data-fade-start={overflowing && !atStart ? '' : undefined}
      data-fade-end={overflowing && !atEnd ? '' : undefined}
      // Focusable only while it actually scrolls (see useScrollEdges).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={overflowing ? 0 : undefined}
      className="relative w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
