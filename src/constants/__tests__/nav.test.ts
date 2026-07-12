import { describe, it, expect } from 'vitest'
import { isNavItemActive, navItemsForRole } from '../nav'
import type { Role } from '@/types'

const ROLES: Role[] = ['admin', 'teacher', 'student', 'tcu']

describe('isNavItemActive', () => {
  it('marks a section active on its own route and on its detail routes', () => {
    expect(isNavItemActive('/app/courses', '/app/courses')).toBe(true)
    expect(isNavItemActive('/app/courses/12', '/app/courses')).toBe(true)
  })

  it('matches the dashboard exactly — every route is under /app', () => {
    expect(isNavItemActive('/app', '/app')).toBe(true)
    expect(isNavItemActive('/app/courses', '/app')).toBe(false)
  })

  it('does not let a route match a sibling with the same prefix', () => {
    expect(isNavItemActive('/app/courses-archive', '/app/courses')).toBe(false)
  })
})

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
