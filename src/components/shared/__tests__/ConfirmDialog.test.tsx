import type { ComponentProps } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { axe } from '@/test/axe'

function renderConfirm(props: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <I18nProvider>
      <ConfirmDialog
        open
        title="Delete student"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        {...props}
      />
    </I18nProvider>
  )
  return { onConfirm, onOpenChange }
}

describe('<ConfirmDialog />', () => {
  it('renders with role="alertdialog"', async () => {
    renderConfirm()
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('traps focus on the cancel action by default', async () => {
    renderConfirm()
    await screen.findByRole('alertdialog')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())
  })

  it('confirming fires onConfirm and closes the dialog', async () => {
    const user = userEvent.setup()
    const { onConfirm, onOpenChange } = renderConfirm()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cancelling closes the dialog without confirming', async () => {
    const user = userEvent.setup()
    const { onConfirm, onOpenChange } = renderConfirm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('has no axe-detectable a11y violations when open', async () => {
    renderConfirm()
    await screen.findByRole('alertdialog')
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
