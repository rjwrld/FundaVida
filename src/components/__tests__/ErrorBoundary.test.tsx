import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n'
import { ErrorBoundary } from '../ErrorBoundary'

function Boom(): never {
  throw new Error('kaboom')
}

function renderBoundary(children: React.ReactNode) {
  return render(
    <I18nProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </I18nProvider>
  )
}

describe('<ErrorBoundary />', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders children when nothing throws', () => {
    renderBoundary(<p>All good</p>)
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders a recoverable fallback instead of a blank page when a child throws', () => {
    // React logs the caught error to console.error; silence it for a clean test run.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderBoundary(<Boom />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('reloads the page when the recovery button is clicked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    renderBoundary(<Boom />)

    await userEvent.click(screen.getByRole('button'))
    expect(reload).toHaveBeenCalledOnce()
  })
})
