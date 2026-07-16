import { describe, it, expect, beforeEach } from 'vitest'
import { can, scopeFor } from '../index'
import { setDemoEpoch } from '@/lib/clock'
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
          approve: true,
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
          mark: true,
          log: false,
          enter: false,
        },
        tcu: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: true,
          mark: false,
          log: true,
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
        announcements: {
          view: true,
          create: true,
          edit: false,
          delete: true,
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
          create: true,
          edit: 'courseOwned',
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: false,
        },
        enrollments: {
          view: 'courseOwned',
          create: 'courseOwned',
          edit: false,
          delete: false,
          approve: 'courseOwned',
          mark: false,
          log: false,
          enter: false,
        },
        grades: {
          view: true,
          create: false,
          edit: 'teacherCanGrade',
          delete: false,
          approve: false,
          mark: false,
          log: false,
          enter: 'teacherCanGrade',
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
          mark: 'courseOwned',
          log: false,
          enter: false,
        },
        tcu: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: 'teacherCanApproveTcuActivity',
          mark: false,
          log: false,
          enter: false,
        },
        bulkEmail: {
          // Teacher may message the class of a Course they own (ADR-0041):
          // context-free (nav/route) stays denied; the predicate opens with a
          // Course in context. Verified in the predicate-with-context block below.
          view: 'courseOwned',
          create: 'courseOwned',
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
        announcements: {
          view: true,
          create: 'courseOwned',
          edit: false,
          delete: 'courseOwned',
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
          request: true,
          withdraw: 'studentOwnsEnrollment',
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
        announcements: {
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
      tcu: {
        // The tcu role does not view the Program catalog (ADR-0035).
        programs: {
          view: false,
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
        announcements: {
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
      'bulkEmail',
      'auditLog',
      'announcements',
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
      // Pin the Demo Epoch (ADR-0014) so "has the course ended" is exact: terms
      // ending before 2026-06-23 are past, terms ending after it are upcoming.
      beforeEach(() => {
        setDemoEpoch(new Date('2026-06-23T15:30:00.000Z'))
      })

      it('teacher enter grades: true when course is owned and has ended', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'primaria',
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
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'primaria',
            status: 'published',
            capacity: 20,
            teacherId: 'teacher-1',
            term: {
              start: '2025-01-01T00:00:00.000Z',
              end: '2027-06-01T00:00:00.000Z', // after the pinned epoch
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
            level: 'primaria',
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
            level: 'primaria',
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
            level: 'primaria',
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

      it('teacher enter/edit grades: false when the owned, ended course is closed (ADR-0025)', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'primaria',
            status: 'closed', // owned + ended, but the cohort is locked
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
        expect(can('teacher', 'enter', 'grades', context)).toBe(false)
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
            level: 'primaria',
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
            level: 'primaria',
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
            level: 'primaria',
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
            level: 'primaria',
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

      it('teacher message class (bulkEmail create/view): true when course is owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'primaria',
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
        expect(can('teacher', 'create', 'bulkEmail', context)).toBe(true)
        expect(can('teacher', 'view', 'bulkEmail', context)).toBe(true)
      })

      it('teacher message class (bulkEmail create): false when course is not owned', () => {
        const context: PermissionContext = {
          userId: 'teacher-1',
          course: {
            id: 'course-1',
            name: 'Math 101',
            description: 'Advanced calculus',
            sede: 'Linda Vista',
            programId: 'prog-1',
            level: 'primaria',
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
        expect(can('teacher', 'create', 'bulkEmail', context)).toBe(false)
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

      it('student withdraw enrollment: true when the enrollment is their own', () => {
        const context: PermissionContext = {
          userId: 'stu-1',
          enrollment: {
            id: 'enr-1',
            studentId: 'stu-1',
            courseId: 'course-1',
            enrolledAt: '2025-06-01T00:00:00.000Z',
            status: 'pending',
            requestedAt: '2025-06-01T00:00:00.000Z',
          },
        }
        expect(can('student', 'withdraw', 'enrollments', context)).toBe(true)
      })

      it('student withdraw enrollment: false when the enrollment belongs to another student', () => {
        const context: PermissionContext = {
          userId: 'stu-1',
          enrollment: {
            id: 'enr-1',
            studentId: 'stu-2', // different student
            courseId: 'course-1',
            enrolledAt: '2025-06-01T00:00:00.000Z',
            status: 'pending',
            requestedAt: '2025-06-01T00:00:00.000Z',
          },
        }
        expect(can('student', 'withdraw', 'enrollments', context)).toBe(false)
      })

      it('predicate cells without context deny by default', () => {
        // student withdraw enrollment without context — the ownership predicate denies
        expect(can('student', 'withdraw', 'enrollments')).toBe(false)
        // teacher enter grades without context
        expect(can('teacher', 'enter', 'grades')).toBe(false)
        // teacher mark attendance without context
        expect(can('teacher', 'mark', 'attendance')).toBe(false)
        // teacher view enrollments without context
        expect(can('teacher', 'view', 'enrollments')).toBe(false)
        // teacher message class (bulkEmail) without context — keeps the nav/route denied
        expect(can('teacher', 'create', 'bulkEmail')).toBe(false)
        expect(can('teacher', 'view', 'bulkEmail')).toBe(false)
        // teacher approve certificates without context
        expect(can('teacher', 'approve', 'certificates')).toBe(false)
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
        bulkEmail: 'all',
        auditLog: 'all',
        announcements: 'all',
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
        certificates: 'ownCourses',
        attendance: 'ownCourses',
        tcu: 'assignedTrainees',
        bulkEmail: 'own',
        auditLog: 'none',
        announcements: 'own',
      })
    })

    it('student has appropriate resource scopes', () => {
      const scopes = scopeFor('student')
      expect(scopes).toEqual({
        programs: 'all',
        // A Student reads their own record ('self') and own enrollments ('own')
        // through the scope seam — without a context-free can('view') cell, so the
        // admin /app/students routes/nav stay gated (issue #166, ADR-0012).
        students: 'self',
        teachers: 'none',
        courses: 'enrolled',
        enrollments: 'own',
        grades: 'own',
        certificates: 'own',
        attendance: 'own',
        tcu: 'none',
        bulkEmail: 'none',
        auditLog: 'none',
        announcements: 'enrolled',
      })
    })

    it('student self/own scopes do not open the admin students/enrollments routes (#166)', () => {
      // The scope tokens grant data visibility; the route/nav gates use can()
      // with no context, which must stay false so a Student never reaches the
      // admin /app/students or /app/enrollments surfaces (ADR-0008/0012).
      expect(scopeFor('student').students).toBe('self')
      expect(scopeFor('student').enrollments).toBe('own')
      expect(can('student', 'view', 'students')).toBe(false)
      expect(can('student', 'view', 'enrollments')).toBe(false)
    })

    it('tcu has self scope for tcu, assigned for courses, and none for everything else', () => {
      const scopes = scopeFor('tcu')
      expect(scopes).toEqual({
        // The tcu catalog read seam is closed (ADR-0035).
        programs: 'none',
        students: 'none',
        teachers: 'none',
        // A TCU volunteer sees the one Course they serve at (ADR-0036).
        courses: 'assigned',
        enrollments: 'none',
        grades: 'none',
        certificates: 'none',
        attendance: 'none',
        tcu: 'self',
        bulkEmail: 'none',
        auditLog: 'none',
        announcements: 'assigned',
      })
    })
  })

  // The Program catalog is org-wide in scope (ADR-0015) but visible per-role
  // (ADR-0035): admin/teacher/student view it whole ('all'); tcu does not view it
  // at all and its read seam is closed ('none').
  describe('programs resource (ADR-0015, ADR-0035)', () => {
    const viewingRoles: Role[] = ['admin', 'teacher', 'student']

    viewingRoles.forEach((role) => {
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

    it('tcu neither views the catalog nor reads it (ADR-0035)', () => {
      expect(can('tcu', 'view', 'programs')).toBe(false)
      expect(can('tcu', 'create', 'programs')).toBe(false)
      expect(can('tcu', 'edit', 'programs')).toBe(false)
      expect(can('tcu', 'delete', 'programs')).toBe(false)
      expect(scopeFor('tcu').programs).toBe('none')
    })
  })
})

describe('teacherCanGrade reads the frozen clock, not wall-time (ADR-0014)', () => {
  // A Demo Epoch well in the past, so "has the course ended" diverges from real
  // wall-time: a term that ended in 2022 is past for a live new Date() but still
  // in the future for this frozen 2020 now.
  const EPOCH = new Date('2020-06-15T00:00:00.000Z')
  beforeEach(() => {
    setDemoEpoch(EPOCH)
  })

  function ownedCourseEndingOn(end: string): PermissionContext {
    return {
      userId: 'teacher-1',
      course: {
        id: 'course-1',
        name: 'Math 101',
        description: '',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'primaria',
        status: 'published',
        capacity: 20,
        teacherId: 'teacher-1',
        term: { start: '2019-01-01T00:00:00.000Z', end },
        meetingDays: ['mon', 'wed'],
        createdAt: '2019-01-01T00:00:00.000Z',
      },
    }
  }

  it('counts a term that ended before the frozen now as ended', () => {
    expect(can('teacher', 'enter', 'grades', ownedCourseEndingOn('2019-06-01T00:00:00.000Z'))).toBe(
      true
    )
  })

  it('counts a term ending after the frozen now as not ended, even though wall-time has passed it', () => {
    expect(can('teacher', 'enter', 'grades', ownedCourseEndingOn('2022-06-01T00:00:00.000Z'))).toBe(
      false
    )
  })

  it('treats a term ending exactly at the frozen now as not ended (shared exclusive isTermEnded seam)', () => {
    // Exactly the Demo Epoch: the shared isTermEnded uses exclusive `isBefore`, so
    // term.end === now is NOT ended — the grade gate must not diverge from the close
    // worklist / "Term ended" badge on this boundary.
    expect(can('teacher', 'enter', 'grades', ownedCourseEndingOn(EPOCH.toISOString()))).toBe(false)
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
