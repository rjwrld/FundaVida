import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useSendEmailCampaign } from '../emailCampaigns'
import { useStore } from '@/data/store'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'toasts.error' && options?.message) {
        return `toasts.error: ${options.message}`
      }
      return key
    },
  }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSendEmailCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
  })

  afterEach(() => {
    useStore.getState().resetDemo()
  })

  it('fires success toast on successful campaign send', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useSendEmailCampaign(), { wrapper: createWrapper() })

    const emailCampaign = {
      subject: 'Test Campaign',
      body: 'Test body',
      filter: { kind: 'all' as const },
      recipientIds: ['stu-1', 'stu-2'],
    }

    result.current.mutate(emailCampaign)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.campaignSent')
  })

  it('fires error toast on failed campaign send', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useSendEmailCampaign(), { wrapper: createWrapper() })

    // Force an error by stubbing the store action
    useStore.setState({
      sendEmailCampaign: () => {
        throw new Error('Campaign send failed')
      },
    })

    const emailCampaign = {
      subject: 'Test Campaign',
      body: 'Test body',
      filter: { kind: 'all' as const },
      recipientIds: ['stu-1', 'stu-2'],
    }

    result.current.mutate(emailCampaign)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Campaign send failed')
  })
})
