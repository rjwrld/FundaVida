import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { AppLayout } from '@/components/layout/AppLayout'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderWithRouter(element: React.ReactNode) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [{ index: true, element: <>{element}</> }],
      },
    ],
    { initialEntries: ['/'] }
  )
  return render(
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  )
}

describe('<AppLayout />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  it('renders the header, sidebar, and outlet content', () => {
    useStore.getState().setRole('admin')
    renderWithRouter(<div>Hello from outlet</div>)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Sections' })).toBeInTheDocument()
    expect(screen.getByText('Hello from outlet')).toBeInTheDocument()
  })

  it('renders a skip-to-main-content link', () => {
    renderWithRouter(<div id="main-content">Content</div>)
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })
})
