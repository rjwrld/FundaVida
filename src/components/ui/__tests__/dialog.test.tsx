import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { axe } from '@/test/axe'

// A minimal, fully-wired instance of the shared Dialog: title + description
// (so it is self-describing) and a focusable body control.
function DialogHarness() {
  return (
    <I18nProvider>
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your details, then save.</DialogDescription>
          </DialogHeader>
          <button type="button">Save</button>
        </DialogContent>
      </Dialog>
    </I18nProvider>
  )
}

describe('<Dialog />', () => {
  it('has no axe-detectable a11y violations when open', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await screen.findByRole('dialog')
    // The dialog renders into a portal on document.body, so scan the whole body.
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('traps focus on open and returns it to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open' })

    await user.click(trigger)
    const dialog = await screen.findByRole('dialog')
    // Focus moves into the dialog (its content or a control within it).
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    // Escape closes the dialog and restores focus to the trigger.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
