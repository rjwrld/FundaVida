import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '../sonner'
import { useTheme } from '@/hooks/useTheme'
import { Toaster as Sonner } from 'sonner'
import { useReducedMotion } from 'framer-motion'

// Mock the useTheme hook
vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(),
}))

// Mock the underlying Sonner toaster
vi.mock('sonner', () => ({
  Toaster: vi.fn(() => null),
}))

// The only framer-motion dependency is the reduced-motion seam; mock it
// directly (per the StatCard/AnimatedNumber precedent) so each test can drive it.
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

describe('Toaster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('renders with light theme when useTheme returns light', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
    })

    render(<Toaster />)
    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'light' }),
      undefined
    )
  })

  it('rerenders with light theme on component update', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
    })

    const { rerender } = render(<Toaster />)
    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'light' }),
      undefined
    )

    // Verify it's still using the hook on rerender
    rerender(<Toaster />)
    expect(vi.mocked(Sonner)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(Sonner)).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ theme: 'light' }),
      undefined
    )
  })

  it('renders with dark theme when useTheme returns dark', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
    })

    render(<Toaster />)
    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' }),
      undefined
    )
  })

  it('renders with system theme when useTheme returns system', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
    })

    render(<Toaster />)
    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'system' }),
      undefined
    )
  })

  it('times the toast enter/exit transition from the shared motion token', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn() })

    render(<Toaster />)

    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({
        toastOptions: expect.objectContaining({
          style: expect.objectContaining({ '--fv-toast-duration': '0.2s' }),
        }),
      }),
      undefined
    )
  })

  it('collapses the toast transition to zero under prefers-reduced-motion', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn() })
    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(<Toaster />)

    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({
        toastOptions: expect.objectContaining({
          style: expect.objectContaining({ '--fv-toast-duration': '0s' }),
        }),
      }),
      undefined
    )
  })

  it('keeps the registry chrome: token-driven surface vars and stock icons', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn() })

    render(<Toaster />)

    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({
        className: 'toaster group',
        style: expect.objectContaining({
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        }),
        icons: expect.objectContaining({
          success: expect.anything(),
          info: expect.anything(),
          warning: expect.anything(),
          error: expect.anything(),
          loading: expect.anything(),
        }),
      }),
      undefined
    )
  })

  it('lets callers override the registry defaults', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn() })

    render(<Toaster position="top-center" />)

    expect(vi.mocked(Sonner)).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-center' }),
      undefined
    )
  })
})
