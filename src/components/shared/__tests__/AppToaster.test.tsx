import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppToaster } from '../AppToaster'
import { useTheme } from '@/hooks/useTheme'
import { Toaster } from 'sonner'
import { useReducedMotion } from 'framer-motion'

// Mock the useTheme hook
vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(),
}))

// Mock the Toaster component
vi.mock('sonner', () => ({
  Toaster: vi.fn(() => null),
}))

// AppToaster's only framer-motion dependency is the reduced-motion seam; mock it
// directly (per the StatCard/AnimatedNumber precedent) so each test can drive it.
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

describe('AppToaster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('renders with light theme when useTheme returns light', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
    })

    render(<AppToaster />)
    expect(vi.mocked(Toaster)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'light' }),
      expect.anything()
    )
  })

  it('rerenders with light theme on component update', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
    })

    const { rerender } = render(<AppToaster />)
    expect(vi.mocked(Toaster)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'light' }),
      expect.anything()
    )

    // Verify it's still using the hook on rerender
    rerender(<AppToaster />)
    expect(vi.mocked(Toaster)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(Toaster)).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ theme: 'light' }),
      expect.anything()
    )
  })

  it('renders with dark theme when useTheme returns dark', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
    })

    render(<AppToaster />)
    expect(vi.mocked(Toaster)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' }),
      expect.anything()
    )
  })

  it('renders with system theme when useTheme returns system', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
    })

    render(<AppToaster />)
    expect(vi.mocked(Toaster)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'system' }),
      expect.anything()
    )
  })

  it('times the toast enter/exit transition from the shared motion token', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn() })

    render(<AppToaster />)

    expect(vi.mocked(Toaster)).toHaveBeenCalledWith(
      expect.objectContaining({
        toastOptions: expect.objectContaining({
          style: expect.objectContaining({ '--fv-toast-duration': '0.2s' }),
        }),
      }),
      expect.anything()
    )
  })

  it('collapses the toast transition to zero under prefers-reduced-motion', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn() })
    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(<AppToaster />)

    expect(vi.mocked(Toaster)).toHaveBeenCalledWith(
      expect.objectContaining({
        toastOptions: expect.objectContaining({
          style: expect.objectContaining({ '--fv-toast-duration': '0s' }),
        }),
      }),
      expect.anything()
    )
  })
})
