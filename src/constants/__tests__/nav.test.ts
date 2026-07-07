import { describe, it, expect } from 'vitest'
import { navItemsForRole } from '../nav'
import type { Role } from '@/types'

const ROLES: Role[] = ['admin', 'teacher', 'student', 'tcu']

describe('navItemsForRole', () => {
  it('exposes the calendar to every role', () => {
    for (const role of ROLES) {
      const items = navItemsForRole(role)
      expect(items.some((item) => item.to === '/app/calendar')).toBe(true)
    }
  })

  it('exposes no Reports entry to any role (module removed)', () => {
    for (const role of ROLES) {
      const items = navItemsForRole(role)
      expect(items.some((item) => item.to === '/app/reports')).toBe(false)
    }
  })

  it('exposes the Program catalog to viewing roles but not tcu (ADR-0035)', () => {
    for (const role of ['admin', 'teacher', 'student'] as Role[]) {
      const items = navItemsForRole(role)
      expect(items.some((item) => item.to === '/app/programs')).toBe(true)
    }
    const tcuItems = navItemsForRole('tcu')
    expect(tcuItems.some((item) => item.to === '/app/programs')).toBe(false)
  })

  it('exposes My profile to the student role only (self-only /app/me is structural)', () => {
    const studentItems = navItemsForRole('student')
    expect(studentItems.some((item) => item.to === '/app/me')).toBe(true)

    for (const role of ['admin', 'teacher', 'tcu'] as Role[]) {
      const items = navItemsForRole(role)
      expect(items.some((item) => item.to === '/app/me')).toBe(false)
    }
  })
})
