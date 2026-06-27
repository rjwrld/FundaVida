import { describe, it, expect } from 'vitest'
import { can, scopeFor } from '../index'
import type { Action, Resource, Role, PermissionContext } from '../index'

describe('Permissions Matrix', () => {
  describe('can()', () => {
    // Exhaustive role × resource × action truth table
    const truthTable: Record<Role, Record<Resource, Partial<Record<Action, boolean | string>>>> = {
      admin: {
        programs: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        students: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        teachers: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        courses: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        enrollments: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        grades: {
          view: true,
          create: false,
          edit: true,
          delete: true,
          approve: false,
          mark: false,
          log: false,
          enter: true,
        },
        certificates: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: true,
          mark: false,
          log: false,
          enter: false,
        },
        attendance: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: true,
          log: false,
          enter: false,
        },
        tcu: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: true,
          enter: false,
        },
        reports: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        bulkEmail: {
          view: true,
          create: true,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        auditLog: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
      },
      teacher: {
        programs: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        students: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        teachers: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        courses: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        enrollments: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        grades: {
          view: true,
          create: false,
          edit: 'courseOwnedAndEnded',
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: 'courseOwnedAndEnded',
        },
        certificates: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        attendance: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: 'courseOwned',
          log: false,
          enter: false,
        },
        tcu: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        reports: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        bulkEmail: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        auditLog: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
      },
      student: {
        programs: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        students: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        teachers: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        courses: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        enrollments: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        grades: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        certificates: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        attendance: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        tcu: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        reports: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        bulkEmail: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        auditLog: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
      },
      tcu: {
        programs: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        students: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        teachers: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        courses: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        enrollments: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        grades: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        certificates: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        attendance: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        tcu: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: 'activityIsOwn',
          enter: false,
        },
        reports: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        bulkEmail: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        auditLog: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
      },
    }

    // Test all cells explicitly
    const roles: Role[] = ['admin', 'teacher', 'student', 'tcu']
    const resources: Resource[] = [
      'programs',
      'students',
      'teachers',
      'courses',
      'enrollments',
      'grades',
      'certificates',
      'attendance',
      'tcu',
      'reports',
      'bulkEmail',
      'auditLog',
    ]
    const actions: Action[] = [
      'view',
      'create',
      'edit',
      'delete',
      'approve',
      'mark',
      'log',
      'enter',
    ]

    roles.forEach((role) => {
      describe(`${role}`, () => {
        resources.forEach((resource) => {
          describe(`${resource}`, () => {
            actions.forEach((action) => {
              it(`${action} → ${getExpectedLabel(truthTable, role, resource, action)}`, () => {
                const expected = truthTable[role]?.[resource]?.[action]
                if (expected === undefined) {
                  expect(can(role, action, resource)).toBe(false)
                } else if (expected === true) {
                  expect(can(role, action, resource)).toBe(true)
                } else if (expected === false) {
                  expect(can(role, action, resource)).toBe(false)
                } else {
                  // Predicate case — without context, should return false (deny by default)
                  expect(can(role, action, resource)).toBe(false)
                }
              })
            })
          })
        })
      })
    })

    describe('predicate cells with context', () => {
      it('teacher enter grades: true when course is owned and has ended', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-1',
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z', // in the past
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'enter', 'grades', context)).toBe(true)
      })

      it('teacher enter grades: false when course is owned but has not ended', () => {
        const futureDate = new Date()
        futureDate.setFullYear(futureDate.getFullYear() + 1)
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-1',
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: futureDate.toISOString(), // in the future
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'enter', 'grades', context)).toBe(false)
      })

      it('teacher enter grades: false when course is not owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-2', // different teacher
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z',
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'enter', 'grades', context)).toBe(false)
      })

      it('teacher edit grades: true when course is owned and has ended', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-1',
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z', // in the past
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'edit', 'grades', context)).toBe(true)
      })

      it('teacher edit grades: false when course is not owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-2', // different teacher
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z',
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'edit', 'grades', context)).toBe(false)
      })

      it('teacher mark attendance: true when course is owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-1',
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z',
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'mark', 'attendance', context)).toBe(true)
      })

      it('teacher mark attendance: false when course is not owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-2', // different teacher
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z',
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'mark', 'attendance', context)).toBe(false)
      })

      it('teacher view enrollments: true when course is owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-1',
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z',
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'view', 'enrollments', context)).toBe(true)
      })

      it('teacher view enrollments: false when course is not owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'both',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-2', // different teacher
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2025-06-01T00:00:00.000Z',
            },
            meetingDays: ['mon', 'wed'],
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        }
        expect(can('teacher', 'view', 'enrollments', context)).toBe(false)
      })

      it('tcu log activity: true when activity traineeId matches userId', () => {
        const context: PermissionContext = {
          userId: 'tcu-user-1',
          activity: {
            id: 'activity-1',
            traineeId: 'tcu-user-1',
            title: 'Volunteer Work',
            hours: 10,
            date: '2025-06-01T00:00:00.000Z',
            status: 'pending',
          },
        }
        expect(can('tcu', 'log', 'tcu', context)).toBe(true)
      })

      it('tcu log activity: false when activity traineeId does not match userId', () => {
        const context: PermissionContext = {
          userId: 'tcu-user-1',
          activity: {
            id: 'activity-1',
            traineeId: 'tcu-user-2', // different trainee
            title: 'Volunteer Work',
            hours: 10,
            date: '2025-06-01T00:00:00.000Z',
            status: 'pending',
          },
        }
        expect(can('tcu', 'log', 'tcu', context)).toBe(false)
      })

      it('predicate cells without context deny by default', () => {
        // teacher enter grades without context
        expect(can('teacher', 'enter', 'grades')).toBe(false)
        // teacher mark attendance without context
        expect(can('teacher', 'mark', 'attendance')).toBe(false)
        // teacher view enrollments without context
        expect(can('teacher', 'view', 'enrollments')).toBe(false)
        // tcu log without context
        expect(can('tcu', 'log', 'tcu')).toBe(false)
      })
    })
  })

  describe('scopeFor()', () => {
    it('admin has all scopes set to all', () => {
      const scopes = scopeFor('admin')
      expect(scopes).toEqual({
        programs: 'all',
        students: 'all',
        teachers: 'all',
        courses: 'all',
        enrollments: 'all',
        grades: 'all',
        certificates: 'all',
        attendance: 'all',
        tcu: 'all',
        reports: 'all',
        bulkEmail: 'all',
        auditLog: 'all',
      })
    })

    it('teacher has appropriate resource scopes', () => {
      const scopes = scopeFor('teacher')
      expect(scopes).toEqual({
        programs: 'all',
        students: 'enrolledInOwnCourses',
        teachers: 'none',
        courses: 'own',
        enrollments: 'ownCourses',
        grades: 'ownCourses',
        certificates: 'none',
        attendance: 'ownCourses',
        tcu: 'none',
        reports: 'none',
        bulkEmail: 'none',
        auditLog: 'none',
      })
    })

    it('student has appropriate resource scopes', () => {
      const scopes = scopeFor('student')
      expect(scopes).toEqual({
        programs: 'all',
        students: 'none',
        teachers: 'none',
        courses: 'enrolled',
        enrollments: 'none',
        grades: 'own',
        certificates: 'own',
        attendance: 'own',
        tcu: 'none',
        reports: 'none',
        bulkEmail: 'none',
        auditLog: 'none',
      })
    })

    it('tcu has self scope for tcu and none for everything else', () => {
      const scopes = scopeFor('tcu')
      expect(scopes).toEqual({
        programs: 'all',
        students: 'none',
        teachers: 'none',
        courses: 'none',
        enrollments: 'none',
        grades: 'none',
        certificates: 'none',
        attendance: 'none',
        tcu: 'self',
        reports: 'none',
        bulkEmail: 'none',
        auditLog: 'none',
      })
    })
  })

  // The Program catalog is a read-only resource viewable by every role with an
  // org-wide 'all' scope (ADR-0015). Locked down here for all four roles.
  describe('programs resource (ADR-0015)', () => {
    const allRoles: Role[] = ['admin', 'teacher', 'student', 'tcu']

    allRoles.forEach((role) => {
      it(`${role} may view programs but never create/edit/delete them`, () => {
        expect(can(role, 'view', 'programs')).toBe(true)
        expect(can(role, 'create', 'programs')).toBe(false)
        expect(can(role, 'edit', 'programs')).toBe(false)
        expect(can(role, 'delete', 'programs')).toBe(false)
      })

      it(`${role} reads the whole program catalog ('all' scope)`, () => {
        expect(scopeFor(role).programs).toBe('all')
      })
    })
  })
})

function getExpectedLabel(
  truthTable: Record<Role, Record<Resource, Partial<Record<Action, boolean | string>>>>,
  role: Role,
  resource: Resource,
  action: Action
): string {
  const expected = truthTable[role]?.[resource]?.[action]
  if (expected === true) return 'true'
  if (expected === false) return 'false'
  if (typeof expected === 'string') return `predicate: ${expected}`
  return 'false (absent)'
}
