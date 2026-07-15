import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Translation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Top-level React error boundary (wired in main.tsx). Without it, any uncaught render
 * throw leaves a permanently blank `#root` — the worst outcome for a portfolio demo,
 * since Vite's dev overlay masks it locally but production ships no overlay. Catches
 * render/lifecycle throws below it and shows a recoverable fallback.
 *
 * Recovery is a full reload rather than a state reset: a boot/render error is usually
 * deterministic, so re-rendering the same tree would just throw again. Copy is resolved
 * via the `<Translation>` render-prop — a class component can't call the useTranslation
 * hook, and this keeps the fallback dependency-light so it can't itself re-throw.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] uncaught render error:', error, info.componentStack)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <Translation>
        {(t) => (
          <div
            role="alert"
            className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
          >
            <h1 className="text-2xl font-semibold tracking-tight">{t('errorBoundary.title')}</h1>
            <p className="max-w-md text-muted-foreground">{t('errorBoundary.message')}</p>
            <Button onClick={() => window.location.reload()}>{t('errorBoundary.reload')}</Button>
          </div>
        )}
      </Translation>
    )
  }
}
