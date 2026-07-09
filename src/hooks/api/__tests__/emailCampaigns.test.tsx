import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useCourseCampaigns, useSendEmailCampaign } from '../emailCampaigns'
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
    useStore.getState().setRole('admin')
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
      audience: 'students' as const,
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
      audience: 'students' as const,
      recipientIds: ['stu-1', 'stu-2'],
    }

    result.current.mutate(emailCampaign)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Campaign send failed')
  })
})

/**
 * ADR-0046: the card is course-filtered and viewer-agnostic. The `select` narrows
 * to this Course; the scope seam underneath narrows to this viewer. `cam-4` is the
 * seeded teacher-authored class message, sent by tea-1 to cou-1.
 */
describe('useCourseCampaigns', () => {
  const CAM_4_COURSE = 'cou-1'

  beforeEach(() => {
    useStore.getState().resetDemo()
  })

  afterEach(() => {
    useStore.getState().resetDemo()
  })

  it('keeps only campaigns targeting the given Course', async () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCourseCampaigns(CAM_4_COURSE), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // cam-1 (all), cam-2 (program), cam-3 (province) all drop out; only cam-4 targets cou-1.
    expect(result.current.data?.map((c) => c.id)).toEqual(['cam-4'])
  })

  it('returns nothing for a Course no campaign targeted', async () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCourseCampaigns('cou-9'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('orders newest-first', async () => {
    useStore.getState().setRole('admin')
    const older = useStore.getState().emailCampaigns.find((c) => c.id === 'cam-4')
    if (!older) throw new Error('seed: cam-4 missing')
    // A second campaign on the same Course, sent a day after cam-4.
    useStore.setState({
      emailCampaigns: [
        ...useStore.getState().emailCampaigns,
        {
          ...older,
          id: 'cam-later',
          sentAt: new Date(new Date(older.sentAt).getTime() + 86_400_000).toISOString(),
        },
      ],
    })

    const { result } = renderHook(() => useCourseCampaigns(CAM_4_COURSE), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((c) => c.id)).toEqual(['cam-later', 'cam-4'])
  })

  it("narrows to the teacher's own campaigns — the production caller of the 'own' scope branch", async () => {
    // An admin broadcast that also targets cou-1: in scope for the admin, out of
    // scope for the teacher, who sent only cam-4.
    const teacherCampaign = useStore.getState().emailCampaigns.find((c) => c.id === 'cam-4')
    if (!teacherCampaign) throw new Error('seed: cam-4 missing')
    useStore.setState({
      emailCampaigns: [
        ...useStore.getState().emailCampaigns,
        { ...teacherCampaign, id: 'cam-admin', sentBy: 'admin' },
      ],
    })

    useStore.getState().setRole('teacher')
    const { result } = renderHook(() => useCourseCampaigns(CAM_4_COURSE), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((c) => c.id)).toEqual(['cam-4'])
  })

  it('leaves a Student with nothing — bulkEmail is an empty grant', async () => {
    useStore.getState().setRole('student')
    const { result } = renderHook(() => useCourseCampaigns(CAM_4_COURSE), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
