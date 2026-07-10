import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty'

export interface NoResultsProps {
  message: string
}

export function NoResults({ message }: NoResultsProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
