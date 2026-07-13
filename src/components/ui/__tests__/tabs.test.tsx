import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { useReducedMotion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * The sliding tab indicator (ADR-0047 phase 6a): the active trigger carries a
 * `layoutId` span that glides between tabs; under prefers-reduced-motion the
 * span is skipped entirely and the stock static active styling takes over.
 *
 * `useReducedMotion()` reads the media query itself and latches module-wide,
 * so — per the data-table/sonner precedent — the hook is the seam: mock it and
 * let each test drive it. The rest of framer-motion is the real thing.
 */
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

function renderTabs(props: React.ComponentProps<typeof Tabs> = {}) {
  return render(
    <Tabs defaultValue="one" {...props}>
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
      <TabsContent value="two">Second panel</TabsContent>
    </Tabs>
  )
}

const indicatorIn = (tab: HTMLElement) => tab.querySelector('[data-slot="tabs-indicator"]')

describe('Tabs sliding indicator', () => {
  it('renders the indicator inside the active trigger only', () => {
    renderTabs()

    expect(indicatorIn(screen.getByRole('tab', { name: 'One' }))).toBeInTheDocument()
    expect(indicatorIn(screen.getByRole('tab', { name: 'Two' }))).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="tabs-indicator"]')).toHaveLength(1)
  })

  it('moves the indicator to the newly selected trigger', async () => {
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('tab', { name: 'Two' }))

    expect(indicatorIn(screen.getByRole('tab', { name: 'Two' }))).toBeInTheDocument()
    expect(indicatorIn(screen.getByRole('tab', { name: 'One' }))).not.toBeInTheDocument()
    expect(screen.getByText('Second panel')).toBeInTheDocument()
  })

  it('follows a controlled value and still reports changes', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    const { rerender } = render(
      <Tabs value="one" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>
    )

    await user.click(screen.getByRole('tab', { name: 'Two' }))
    expect(onValueChange).toHaveBeenCalledWith('two')
    // Controlled: the indicator stays where the prop says until the owner moves it.
    expect(indicatorIn(screen.getByRole('tab', { name: 'One' }))).toBeInTheDocument()

    rerender(
      <Tabs value="two" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(indicatorIn(screen.getByRole('tab', { name: 'Two' }))).toBeInTheDocument()
    expect(indicatorIn(screen.getByRole('tab', { name: 'One' }))).not.toBeInTheDocument()
  })

  it('renders no indicator under prefers-reduced-motion — the static active state stands in', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const user = userEvent.setup()
    renderTabs()

    expect(document.querySelector('[data-slot="tabs-indicator"]')).not.toBeInTheDocument()

    // Selection itself is untouched: the active state still moves.
    await user.click(screen.getByRole('tab', { name: 'Two' }))
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('data-state', 'active')
    expect(document.querySelector('[data-slot="tabs-indicator"]')).not.toBeInTheDocument()
  })

  it('keeps the two-list markup addressable by role', () => {
    renderTabs()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('First panel')
  })
})
