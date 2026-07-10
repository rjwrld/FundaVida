import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
}

export interface EmptyStateProps extends React.ComponentProps<typeof Empty> {
  heading: string
  body: string
  illustration?: React.ReactNode
  action?: EmptyStateAction
}

export function EmptyState({
  heading,
  body,
  illustration,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <Empty className={className} {...props}>
      <EmptyHeader>
        {illustration ? (
          <EmptyMedia className="w-full max-w-[200px]">{illustration}</EmptyMedia>
        ) : null}
        <EmptyTitle>{heading}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent>
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
