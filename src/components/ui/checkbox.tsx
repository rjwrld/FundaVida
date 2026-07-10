import * as React from 'react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & { label?: string }
>(({ className, label, ...props }, ref) => {
  const generatedId = React.useId()
  const id = props.id ?? generatedId
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded-sm border border-input bg-background ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        id={id}
        {...props}
      />
      {label && (
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
    </div>
  )
})
Checkbox.displayName = 'Checkbox'

export { Checkbox }
