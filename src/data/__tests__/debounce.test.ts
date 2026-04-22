import { describe, it, expect, vi } from 'vitest'
import { debounce } from '../debounce'

describe('debounce', () => {
  it('invokes the callback only once after the wait window', () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    const debounced = debounce(spy, 200)
    debounced('a')
    debounced('b')
    debounced('c')
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(199)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('c')
    vi.useRealTimers()
  })

  it('restarts the window on each call', () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    const debounced = debounce(spy, 100)
    debounced(1)
    vi.advanceTimersByTime(80)
    debounced(2)
    vi.advanceTimersByTime(80)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith(2)
    vi.useRealTimers()
  })
})
