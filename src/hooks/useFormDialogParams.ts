import { useSearchParams } from 'react-router-dom'

/**
 * Drives an add/edit modal from the URL query string so the form is deep-linkable and the
 * browser Back button closes it: `?form=new` opens the create modal, `?edit=<id>` opens the edit
 * modal for that record. Opening pushes a history entry; closing replaces it.
 */
export function useFormDialogParams() {
  const [params, setParams] = useSearchParams()
  const editId = params.get('edit') ?? undefined
  const isCreate = params.get('form') === 'new'
  const isOpen = isCreate || Boolean(editId)
  const mode: 'create' | 'edit' = editId ? 'edit' : 'create'

  function openCreate() {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('edit')
      next.set('form', 'new')
      return next
    })
  }

  function openEdit(id: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('form')
      next.set('edit', id)
      return next
    })
  }

  function close() {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('form')
        next.delete('edit')
        return next
      },
      { replace: true }
    )
  }

  return { isOpen, mode, editId, openCreate, openEdit, close }
}
