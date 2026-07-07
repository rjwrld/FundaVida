import { describe, it, expect } from 'vitest'
import { resolveQueries, type QueryLike } from '@/lib/resolveQueries'

/** Minimal fakes over the structural QueryLike seam — no React Query needed. */
function loaded<D>(data: D): QueryLike<D> {
  return { isLoading: false, data }
}
function loading<D>(): QueryLike<D> {
  return { isLoading: true, data: undefined }
}
/** A conditionally-disabled query: never loading, no data, forever. */
function disabled<D>(): QueryLike<D> {
  return { isLoading: false, data: undefined }
}

describe('resolveQueries', () => {
  it('resolves to a positional tuple once every input has loaded', () => {
    const result = resolveQueries([loaded([1, 2]), loaded('x')])
    expect(result.isPending).toBe(false)
    // data is undefined until the guard clears, then the tuple in order.
    expect(result.data).toEqual([[1, 2], 'x'])
  })

  it('stays pending while any single input is still loading', () => {
    const result = resolveQueries([loaded([1, 2]), loading<string>()])
    expect(result.isPending).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('does not hang on a conditionally-disabled input (gates on isLoading, not isPending)', () => {
    const result = resolveQueries([loaded([1, 2]), disabled<string>()])
    expect(result.isPending).toBe(false)
    // The disabled slot contributes its undefined data despite the tuple's
    // non-undefined element type (ADR-0030): callers reading data pass only
    // always-enabled queries.
    expect(result.data).toEqual([[1, 2], undefined])
  })
})
