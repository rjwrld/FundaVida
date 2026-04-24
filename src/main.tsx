import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { I18nProvider } from './lib/i18n'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 0,
    },
  },
})

createRoot(rootEl).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </I18nProvider>
    </MotionConfig>
  </StrictMode>
)
