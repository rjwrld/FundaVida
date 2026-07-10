import { Check, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RowActionsProps {
  /** Accessible label for the edit button, e.g. "Edit Ada Lovelace". Required when onEdit is set. */
  editLabel?: string
  /** Accessible label for the delete button, e.g. "Delete Ada Lovelace". Required when onDelete is set. */
  deleteLabel?: string
  /** Accessible label for the publish button. Required when onPublish is set. */
  publishLabel?: string
  onEdit?: () => void
  onDelete?: () => void
  onPublish?: () => void
}

/**
 * Inline row actions: Edit, Publish, and/or Delete icon buttons.
 * Any action can be omitted. Icon-only, so each button carries an item-specific aria-label.
 */
export function RowActions({
  editLabel,
  deleteLabel,
  publishLabel,
  onEdit,
  onDelete,
  onPublish,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onPublish ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 text-muted-foreground hover:text-success"
          aria-label={publishLabel ?? 'Publish'}
          onClick={onPublish}
          data-testid="publish-button"
        >
          <Check size={16} />
        </Button>
      ) : null}
      {onEdit ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 text-muted-foreground hover:text-foreground"
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
          className="h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 text-muted-foreground hover:text-destructive"
          aria-label={deleteLabel}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      ) : null}
    </div>
  )
}
