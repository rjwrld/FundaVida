import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RowActionsProps {
  /** Accessible label for the edit button, e.g. "Edit Ada Lovelace". Required when onEdit is set. */
  editLabel?: string
  /** Accessible label for the delete button, e.g. "Delete Ada Lovelace". Required when onDelete is set. */
  deleteLabel?: string
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * Inline row actions: an Edit and/or Delete icon button. Replaces the per-row "⋯" dropdown.
 * Either action can be omitted (e.g. enrollments only support delete). Icon-only, so each
 * button carries an item-specific aria-label.
 */
export function RowActions({ editLabel, deleteLabel, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={editLabel}
          onClick={onEdit}
        >
          <Pencil size={16} />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={deleteLabel}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      ) : null}
    </div>
  )
}
