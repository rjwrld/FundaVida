import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { clock } from '@/lib/clock'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('Course authoring (ADR-0016)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  describe('teacherCreateCourse', () => {
    it('teacher can create a draft course at their own Sede', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = state.teachers.find((t) => t.id === state.currentUserId)
      if (!teacher) throw new Error('expected teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      const coursesBefore = state.courses.length
      const newCourse = state.createCourse({
        name: 'New Course',
        description: 'A new course',
        sede: teacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      expect(newCourse.status).toBe('draft')
      expect(newCourse.teacherId).toBe(teacher.id)
      expect(useStore.getState().courses).toHaveLength(coursesBefore + 1)
    })

    it('teacher cannot create a course at a different Sede', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = state.teachers.find((t) => t.id === state.currentUserId)
      if (!teacher) throw new Error('expected teacher in demo')
      const otherTeacher = state.teachers.find((t) => t.sede !== teacher.sede)
      if (!otherTeacher) throw new Error('expected a teacher at a different sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      expect(() => {
        state.createCourse({
          name: 'Cross-Sede Course',
          description: 'Should fail',
          sede: otherTeacher.sede,
          programId: program.id,
          level: 'primaria',
          status: 'draft',
          capacity: 20,
          teacherId: teacher.id,
          term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
          meetingDays: ['mon', 'wed'],
        })
      }).toThrow()
    })

    it('teacher cannot self-assign another teacher', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = state.teachers.find((t) => t.id === state.currentUserId)
      if (!teacher) throw new Error('expected teacher in demo')
      const otherTeacher = state.teachers.find(
        (t) => t.sede === teacher.sede && t.id !== teacher.id
      )
      if (!otherTeacher) throw new Error('expected another teacher at the same sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      expect(() => {
        state.createCourse({
          name: 'Misassigned Course',
          description: 'Should fail',
          sede: teacher.sede,
          programId: program.id,
          level: 'primaria',
          status: 'draft',
          capacity: 20,
          teacherId: otherTeacher.id,
          term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
          meetingDays: ['mon', 'wed'],
        })
      }).toThrow('permission denied')
    })

    it('admin can create a course with any teacher', () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const anyTeacher = state.teachers[0]
      if (!anyTeacher) throw new Error('expected a teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      const coursesBefore = state.courses.length
      const newCourse = state.createCourse({
        name: 'Admin-Created Course',
        description: 'Created by admin',
        sede: anyTeacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: anyTeacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      expect(useStore.getState().courses).toHaveLength(coursesBefore + 1)
      expect(newCourse.teacherId).toBe(anyTeacher.id)
    })
  })

  describe('publishCourse', () => {
    it('teacher can publish their own draft course', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = state.teachers.find((t) => t.id === state.currentUserId)
      if (!teacher) throw new Error('expected teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      // Create a draft
      const draft = state.createCourse({
        name: 'Draft Course',
        description: 'A draft',
        sede: teacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      // Publish it
      state.publishCourse(draft.id)

      // Verify it's published
      const updated = useStore.getState().courses.find((c) => c.id === draft.id)
      expect(updated?.status).toBe('published')
    })

    it("teacher cannot publish another teacher's draft", () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const teacher1 = state.teachers[0]
      if (!teacher1) throw new Error('expected a teacher in demo')
      const teacher2 = state.teachers.find((t) => t.sede === teacher1.sede && t.id !== teacher1.id)
      if (!teacher2) throw new Error('expected two teachers in the same sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      // Admin creates a draft for teacher1
      const draft = state.createCourse({
        name: 'Draft Course',
        description: 'A draft',
        sede: teacher1.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher1.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      // Switch to teacher2, try to publish
      useStore.getState().setRole('teacher')
      // Manually override currentUserId to teacher2 for this test
      const stateWithTeacher2 = useStore.getState()
      stateWithTeacher2.currentUserId = teacher2.id

      expect(() => {
        stateWithTeacher2.publishCourse(draft.id)
      }).toThrow()
    })

    it('admin can publish any course', () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const teacher = state.teachers[0]
      if (!teacher) throw new Error('expected a teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      // Admin creates a draft
      const draft = state.createCourse({
        name: 'Draft Course',
        description: 'A draft',
        sede: teacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      // Admin publishes it
      state.publishCourse(draft.id)

      // Verify it's published
      const updated = useStore.getState().courses.find((c) => c.id === draft.id)
      expect(updated?.status).toBe('published')
    })
  })

  describe('closeCourse (ADR-0024)', () => {
    function publishedDraft() {
      const state = useStore.getState()
      const teacher = state.teachers.find((t) => t.id === state.currentUserId)
      if (!teacher) throw new Error('expected teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')
      const draft = state.createCourse({
        name: 'Closeable Course',
        description: 'A course to close',
        sede: teacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })
      state.publishCourse(draft.id)
      return draft
    }

    it('teacher can close their own published course', () => {
      useStore.getState().setRole('teacher')
      const course = publishedDraft()

      useStore.getState().closeCourse(course.id)

      const updated = useStore.getState().courses.find((c) => c.id === course.id)
      expect(updated?.status).toBe('closed')
    })

    it('throws when closing a draft course (close is published-only)', () => {
      useStore.getState().setRole('teacher')
      const state = useStore.getState()
      const teacher = state.teachers.find((t) => t.id === state.currentUserId)
      if (!teacher) throw new Error('expected teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')
      const draft = state.createCourse({
        name: 'Still A Draft',
        description: 'Never published',
        sede: teacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      expect(() => useStore.getState().closeCourse(draft.id)).toThrow()
      expect(useStore.getState().courses.find((c) => c.id === draft.id)?.status).toBe('draft')
    })

    it('throws when closing an already-closed course (close is idempotent-rejecting)', () => {
      useStore.getState().setRole('teacher')
      const course = publishedDraft()
      useStore.getState().closeCourse(course.id)

      expect(() => useStore.getState().closeCourse(course.id)).toThrow()
    })

    it('admin can close any published course', () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const teacher = state.teachers[0]
      if (!teacher) throw new Error('expected a teacher in demo')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')
      const draft = state.createCourse({
        name: 'Admin Closeable',
        description: 'Closed by admin',
        sede: teacher.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })
      state.publishCourse(draft.id)

      state.closeCourse(draft.id)

      expect(useStore.getState().courses.find((c) => c.id === draft.id)?.status).toBe('closed')
    })

    it("denies a teacher closing another teacher's course (assertCan throws)", () => {
      // Admin creates + publishes a course owned by teacher1.
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const teacher1 = state.teachers[0]
      if (!teacher1) throw new Error('expected a teacher in demo')
      const teacher2 = state.teachers.find((t) => t.sede === teacher1.sede && t.id !== teacher1.id)
      if (!teacher2) throw new Error('expected two teachers in the same sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')
      const draft = state.createCourse({
        name: "Teacher1's Course",
        description: 'Owned by teacher1',
        sede: teacher1.sede,
        programId: program.id,
        level: 'primaria',
        status: 'draft',
        capacity: 20,
        teacherId: teacher1.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })
      state.publishCourse(draft.id)

      // Switch to teacher2 and try to close teacher1's course.
      useStore.getState().setRole('teacher')
      const stateAsTeacher2 = useStore.getState()
      stateAsTeacher2.currentUserId = teacher2.id

      expect(() => stateAsTeacher2.closeCourse(draft.id)).toThrow('permission denied')
      expect(useStore.getState().courses.find((c) => c.id === draft.id)?.status).toBe('published')
    })

    it('records exactly one audit entry with action "close" for the closed course', () => {
      useStore.getState().setRole('teacher')
      const course = publishedDraft()
      const auditBefore = useStore.getState().auditLog.length

      useStore.getState().closeCourse(course.id)

      const auditLog = useStore.getState().auditLog
      expect(auditLog.length).toBe(auditBefore + 1)
      const entry = auditLog[0]
      expect(entry?.action).toBe('close')
      expect(entry?.entity).toBe('course')
      expect(entry?.entityId).toBe(course.id)
    })
  })

  describe('draft courses invisible to students', () => {
    it('student does not see a draft course in browse (browseable scope)', async () => {
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const student = state.students[0]
      if (!student) throw new Error('expected a student in demo')
      const teacher = state.teachers.find((t) => t.sede === student.sede)
      if (!teacher) throw new Error('expected a teacher at student sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      // Admin creates a draft matching the student's sede and level
      state.createCourse({
        name: 'Hidden Draft',
        description: 'A draft',
        sede: student.sede,
        programId: program.id,
        level: student.educationalLevel,
        status: 'draft',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2026-07-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
        meetingDays: ['mon', 'wed'],
      })

      // Student reads the browse list
      useStore.getState().setRole('student')
      const browseable = await api.courses.list({
        scopeOverride: 'browseable',
      })

      // The draft should not appear
      expect(browseable).not.toContainEqual(expect.objectContaining({ name: 'Hidden Draft' }))
    })
  })

  describe('Term-ended courses invisible in Browse (ADR-0042, issue #257)', () => {
    it('excludes a Term-ended published course from the browse list but keeps an open one', async () => {
      // The browse list is titled "open courses": a Term-ended cohort still shows a
      // "Term ended" badge with no action, so it must not list. The `browseable`
      // scope stays Term-agnostic (view access); the list narrows it via
      // isOpenForEnrollment, so only Starts-soon / In-progress cohorts appear.
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      // stu-1 is the student persona whose Sede/level the browse scope keys off.
      const student = state.students.find((s) => s.id === 'stu-1')
      if (!student) throw new Error('expected stu-1 in demo')
      const teacher = state.teachers.find((t) => t.sede === student.sede)
      if (!teacher) throw new Error('expected a teacher at student sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      const now = clock.now()
      const iso = (offsetDays: number) =>
        new Date(now.getTime() + offsetDays * 24 * 3600 * 1000).toISOString()
      const base = {
        description: 'A cohort',
        sede: student.sede,
        programId: program.id,
        level: student.educationalLevel,
        status: 'published' as const,
        capacity: 20,
        teacherId: teacher.id,
        meetingDays: ['mon' as const, 'wed' as const],
      }

      // A published cohort whose Term has already ended — viewable, not enrollable.
      const ended = state.createCourse({
        ...base,
        name: 'Ended Cohort',
        term: { start: iso(-60), end: iso(-1) },
      })
      // A published cohort currently in progress — open for enrollment.
      const open = state.createCourse({
        ...base,
        name: 'Open Cohort',
        term: { start: iso(-10), end: iso(30) },
      })

      useStore.getState().setRole('student')
      const browseable = await api.courses.list({ scopeOverride: 'browseable' })
      const ids = browseable.map((c) => c.id)

      expect(ids).toContain(open.id)
      expect(ids).not.toContain(ended.id)
    })

    it('still serves a Term-ended course via get — detail view access does not collapse', async () => {
      // The seam split: the same Term-ended cohort dropped from the list above is
      // still reachable by id, so a non-enrolled Student can open its detail (badge
      // shown, request button hidden — ADR-0042).
      useStore.getState().setRole('admin')
      const state = useStore.getState()
      const student = state.students.find((s) => s.id === 'stu-1')
      if (!student) throw new Error('expected stu-1 in demo')
      const teacher = state.teachers.find((t) => t.sede === student.sede)
      if (!teacher) throw new Error('expected a teacher at student sede')
      const program = state.programs[0]
      if (!program) throw new Error('expected a program in demo')

      const now = clock.now()
      const iso = (offsetDays: number) =>
        new Date(now.getTime() + offsetDays * 24 * 3600 * 1000).toISOString()
      const ended = state.createCourse({
        name: 'Ended Cohort',
        description: 'A cohort',
        sede: student.sede,
        programId: program.id,
        level: student.educationalLevel,
        status: 'published',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: iso(-60), end: iso(-1) },
        meetingDays: ['mon', 'wed'],
      })

      useStore.getState().setRole('student')
      const viewed = await api.courses.get(ended.id, 'browseable')
      expect(viewed?.id).toBe(ended.id)
    })
  })
})
