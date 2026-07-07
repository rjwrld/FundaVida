import { describe, it, expect } from 'vitest'
import { listViewState } from '../listViewState'

describe('listViewState', () => {
  it('reports loading while the query is in flight', () => {
    expect(listViewState({ isLoading: true, count: 0, hasFilters: false })).toBe('loading')
  })

  it('reports loading even once rows have arrived, so a refetch never flashes data→empty', () => {
    expect(listViewState({ isLoading: true, count: 5, hasFilters: false })).toBe('loading')
  })

  it('reports loading over a filtered fetch, so an in-flight filter never flashes noResults', () => {
    // The whole bug surface: loading is read before the count===0 branches.
    expect(listViewState({ isLoading: true, count: 0, hasFilters: true })).toBe('loading')
  })

  it('reports data once loaded with rows and no filters', () => {
    expect(listViewState({ isLoading: false, count: 3, hasFilters: false })).toBe('data')
  })

  it('reports data once loaded with rows even while filters are active', () => {
    expect(listViewState({ isLoading: false, count: 3, hasFilters: true })).toBe('data')
  })

  it('reports empty for a loaded, unfiltered, zero-row collection', () => {
    expect(listViewState({ isLoading: false, count: 0, hasFilters: false })).toBe('empty')
  })

  it('reports noResults for a loaded, filtered-to-nothing view', () => {
    // Distinguished from empty only by hasFilters, and only after loading clears.
    expect(listViewState({ isLoading: false, count: 0, hasFilters: true })).toBe('noResults')
  })
})
