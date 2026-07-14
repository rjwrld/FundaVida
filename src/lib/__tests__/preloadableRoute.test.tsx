import { describe, it, expect, vi } from 'vitest'
import { Suspense } from 'react'
import { render, screen } from '@testing-library/react'
import { preloadableRoute } from '@/lib/preloadableRoute'

function Page() {
  return <p>the page</p>
}

/** A module loader whose promise we resolve by hand, so "has it settled?" is exact. */
function deferredLoader() {
  let resolve!: () => void
  const settled = new Promise<void>((r) => {
    resolve = r
  })
  const load = vi.fn(async () => {
    await settled
    return { default: Page }
  })
  return { load, resolve, settled }
}

function renderRoute(Route: () => React.JSX.Element) {
  return render(
    <Suspense fallback={<p>loading</p>}>
      <Route />
    </Suspense>
  )
}

describe('preloadableRoute', () => {
  it('renders a preloaded page with no suspended commit — the frame the morph needs', async () => {
    const { load, resolve } = deferredLoader()
    const route = preloadableRoute(load)

    route.preload()
    resolve()
    await load.mock.results[0]?.value

    renderRoute(route.Route)

    // Synchronously on the first commit: no `loading` frame ever painted, which is
    // the whole point — a suspended commit lands after the outlet has torn the
    // previous page down, and the shared element has nothing left to grow from.
    expect(screen.getByText('the page')).toBeInTheDocument()
    expect(screen.queryByText('loading')).not.toBeInTheDocument()
  })

  it('suspends as a plain lazy route when it was never preloaded', async () => {
    const { load, resolve } = deferredLoader()
    const route = preloadableRoute(load)

    renderRoute(route.Route)

    expect(screen.getByText('loading')).toBeInTheDocument()

    resolve()

    expect(await screen.findByText('the page')).toBeInTheDocument()
  })

  it('keeps a suspended mount on the lazy component, never swapping type mid-mount', async () => {
    const { load, resolve } = deferredLoader()
    const route = preloadableRoute(load)

    // This mount starts before the module lands…
    renderRoute(route.Route)
    expect(screen.getByText('loading')).toBeInTheDocument()

    // …and the module landing must not swap the element type under it: that would
    // remount the page, refetching its queries and dropping its state.
    resolve()
    expect(await screen.findByText('the page')).toBeInTheDocument()
    // One load for the lazy component; `preload` after the fact must not add another.
    route.preload()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loads the module once, however many times intent fires', async () => {
    const { load, resolve } = deferredLoader()
    const route = preloadableRoute(load)

    route.preload()
    resolve()
    await load.mock.results[0]?.value
    route.preload()
    route.preload()

    expect(load).toHaveBeenCalledTimes(1)
  })
})
