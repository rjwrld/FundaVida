export interface NoResultsProps {
  message: string
}

export function NoResults({ message }: NoResultsProps) {
  return (
    <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}
