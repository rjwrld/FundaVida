import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RowActions } from '@/components/shared/RowActions'

describe('<RowActions />', () => {
  it('renders edit and delete buttons and fires their handlers', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <RowActions
        editLabel="Edit Ada"
        deleteLabel="Delete Ada"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Edit Ada' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Delete Ada' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('renders only the delete button when onEdit is omitted', () => {
    render(<RowActions deleteLabel="Delete row" onDelete={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete row' })).toBeInTheDocument()
  })
})
