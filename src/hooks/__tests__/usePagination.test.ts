import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePagination } from '@/hooks/usePagination'

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagination', () => {
  it('windows the first page of items', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.current.pageCount).toBe(3)
    expect(result.current.total).toBe(25)
  })

  it('moves between pages with next/prev and reports the windowed slice', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    act(() => result.current.next())
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])

    act(() => result.current.prev())
    expect(result.current.page).toBe(1)
    expect(result.current.pageItems[0]).toBe(1)
  })

  it('jumps to the first and last page', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    act(() => result.current.last())
    expect(result.current.page).toBe(3)
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25])

    act(() => result.current.first())
    expect(result.current.page).toBe(1)
  })

  it('reports nav availability at the boundaries', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(true)

    act(() => result.current.last())
    expect(result.current.canPrev).toBe(true)
    expect(result.current.canNext).toBe(false)
  })

  it('exposes the 1-indexed row range for the current page', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    expect(result.current.range).toEqual({ from: 1, to: 10 })

    act(() => result.current.last())
    expect(result.current.range).toEqual({ from: 21, to: 25 })
  })

  it('does not move past the boundaries', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    act(() => result.current.prev())
    expect(result.current.page).toBe(1)

    act(() => result.current.last())
    act(() => result.current.next())
    expect(result.current.page).toBe(3)
  })

  it('changing the page size re-windows and returns to the first page', () => {
    const { result } = renderHook(() => usePagination(items(25), { pageSize: 10 }))

    act(() => result.current.last())
    expect(result.current.page).toBe(3)

    act(() => result.current.setPageSize(25))
    expect(result.current.pageSize).toBe(25)
    expect(result.current.page).toBe(1)
    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toHaveLength(25)
  })

  it('clamps the current page when the item list shrinks', () => {
    const { result, rerender } = renderHook(({ data }) => usePagination(data, { pageSize: 10 }), {
      initialProps: { data: items(25) },
    })

    act(() => result.current.last())
    expect(result.current.page).toBe(3)

    // A filter narrows the scoped list to a single page.
    rerender({ data: items(8) })
    expect(result.current.page).toBe(1)
    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('handles a single full page (no second page)', () => {
    const { result } = renderHook(() => usePagination(items(10), { pageSize: 10 }))

    expect(result.current.pageCount).toBe(1)
    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(false)
    expect(result.current.range).toEqual({ from: 1, to: 10 })
  })

  it('handles zero rows', () => {
    const { result } = renderHook(() => usePagination<number>([], { pageSize: 10 }))

    expect(result.current.total).toBe(0)
    expect(result.current.page).toBe(1)
    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toEqual([])
    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(false)
    expect(result.current.range).toEqual({ from: 0, to: 0 })
  })
})
