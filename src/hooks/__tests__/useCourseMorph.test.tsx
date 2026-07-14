import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReducedMotion } from 'framer-motion'
import { courseMorphLayoutId } from '@/lib/courseMorph'
import { useCourseMorphTarget } from '@/hooks/useCourseMorph'

// The morph opts out through the hook's own `useReducedMotion()` read — mock the
// hook, not `MotionConfig`, which only steers framer's animation engine and would
// leave this verdict (whether the heading even carries a `layoutId`) untouched.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: vi.fn(() => false),
}))

const mockReducedMotion = vi.mocked(useReducedMotion)

describe('useCourseMorphTarget', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false)
  })

  it('arms the morph when the page paints its heading on the first commit', () => {
    const { result } = renderHook(() => useCourseMorphTarget('cou-1', false))

    expect(result.current).toBe(courseMorphLayoutId('cou-1'))
  })

  it('stays disarmed for a mount that opened on the loading gate, even once it resolves', () => {
    // A cold mount paints the loading gate first, so the list — and with it the
    // source node this heading would morph from — is already unmounted by the time
    // the heading appears. Arming later would animate from nothing.
    const { result, rerender } = renderHook(
      ({ isPending }: { isPending: boolean }) => useCourseMorphTarget('cou-1', isPending),
      { initialProps: { isPending: true } }
    )

    expect(result.current).toBeUndefined()

    rerender({ isPending: false })

    expect(result.current).toBeUndefined()
  })

  it('re-decides warmth when the route param swaps to another Course', () => {
    const { result, rerender } = renderHook(
      ({ id, isPending }: { id: string; isPending: boolean }) =>
        useCourseMorphTarget(id, isPending),
      { initialProps: { id: 'cou-1', isPending: true } }
    )

    expect(result.current).toBeUndefined()

    rerender({ id: 'cou-2', isPending: false })

    expect(result.current).toBe(courseMorphLayoutId('cou-2'))
  })

  it('disarms under prefers-reduced-motion', () => {
    mockReducedMotion.mockReturnValue(true)

    const { result } = renderHook(() => useCourseMorphTarget('cou-1', false))

    expect(result.current).toBeUndefined()
  })

  it('disarms without a Course id', () => {
    const { result } = renderHook(() => useCourseMorphTarget(undefined, false))

    expect(result.current).toBeUndefined()
  })
})
