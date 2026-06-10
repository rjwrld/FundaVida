import { describe, it, expect } from 'vitest'
import { cn, mostRecentByDate } from '@/lib/utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    const show = false
    expect(cn('a', show && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('merges conflicting tailwind classes — last wins', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('mostRecentByDate', () => {
  it('returns the count most recent items, newest first', () => {
    const items = [
      { id: 'a', date: '2026-01-10T09:00:00Z' },
      { id: 'b', date: '2026-03-02T09:00:00Z' },
      { id: 'c', date: '2026-02-20T09:00:00Z' },
    ]
    expect(mostRecentByDate(items, 2).map((i) => i.id)).toEqual(['b', 'c'])
  })

  it('keeps insertion order for items sharing a date (stable sort)', () => {
    const items = [
      { id: 'first', date: '2026-01-15T10:00:00Z' },
      { id: 'second', date: '2026-01-15T10:00:00Z' },
    ]
    expect(mostRecentByDate(items, 2).map((i) => i.id)).toEqual(['first', 'second'])
  })

  it('does not mutate the input array', () => {
    const items = [
      { id: 'a', date: '2026-01-10T09:00:00Z' },
      { id: 'b', date: '2026-03-02T09:00:00Z' },
    ]
    mostRecentByDate(items, 1)
    expect(items.map((i) => i.id)).toEqual(['a', 'b'])
  })
})
