import { describe, it, expect } from 'vitest'
import { readSidebarState } from '@/lib/sidebarState'

describe('readSidebarState', () => {
  it('defaults to expanded when the cookie was never written', () => {
    expect(readSidebarState('')).toBe(true)
    expect(readSidebarState('theme=dark; locale=es')).toBe(true)
  })

  it('reads the collapsed state the Sidebar block wrote', () => {
    expect(readSidebarState('sidebar_state=false')).toBe(false)
    expect(readSidebarState('theme=dark; sidebar_state=false; locale=es')).toBe(false)
  })

  it('reads the expanded state back as expanded', () => {
    expect(readSidebarState('sidebar_state=true')).toBe(true)
    expect(readSidebarState('theme=dark; sidebar_state=true')).toBe(true)
  })

  // A cookie named `x-sidebar_state` (or any suffix collision) is not ours.
  it('only matches the whole cookie name', () => {
    expect(readSidebarState('x-sidebar_state=false')).toBe(true)
  })

  it('treats an unparseable value as expanded', () => {
    expect(readSidebarState('sidebar_state=')).toBe(true)
    expect(readSidebarState('sidebar_state=nonsense')).toBe(true)
  })
})
