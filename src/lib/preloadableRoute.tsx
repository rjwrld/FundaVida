import { lazy, useState, type ComponentType, type LazyExoticComponent } from 'react'

type PageLoader = () => Promise<{ default: ComponentType }>
type Page = ComponentType | LazyExoticComponent<ComponentType>

/**
 * A code-split page (#353) that can be warmed to the point of rendering *without a
 * suspended commit*. `React.lazy` alone cannot: its payload settles only once React
 * has tried to render it, so the first render of a lazy route always costs an extra
 * commit — even when the chunk is already sitting in the browser's module cache.
 *
 * That extra commit is invisible almost everywhere, but it lands squarely on the
 * shared-element morph (`lib/courseMorph.ts`): the outlet tears the previous page
 * down before mounting the next, so a heading that arrives a commit late arrives
 * after framer has let go of the source's box, and the morph silently degrades to a
 * plain navigation. It made the *first* Course of every session the one that didn't
 * morph. `preload()` — called on the same hover/focus intent that warms the queries —
 * resolves the module up front, and `Route` then renders it synchronously.
 *
 * The choice is frozen per mount. If `preload()` resolved *while* a not-yet-loaded
 * mount was on screen, swapping the element type mid-mount would remount the page —
 * refetching its queries and dropping its state — so a mount that started on the
 * lazy component stays on it, and simply suspends as it always did.
 */
export function preloadableRoute(load: PageLoader) {
  let loaded: ComponentType | null = null
  let loading: Promise<{ default: ComponentType }> | null = null

  // One load, whichever end asks first — a hover that beats the router, or a router
  // that beats the hover. React.lazy would otherwise call `load` a second time.
  const loadOnce = () => {
    loading ??= load().then((module) => {
      loaded = module.default
      return module
    })
    return loading
  }

  const Lazy = lazy(loadOnce)

  function preload() {
    void loadOnce()
  }

  function Route() {
    const [Page] = useState<Page>(() => loaded ?? Lazy)
    return <Page />
  }

  return { Route, preload }
}
