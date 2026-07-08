import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { clock } from '@/lib/clock'

describe('store permission guards', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    // Clear audit log to observe guard behavior cleanly
    useStore.setState({ auditLog: [], currentUserId: null })
  })

  describe('student CRUD guards', () => {
    it('teacher cannot create a student', () => {
      useStore.getState().setRole('teacher')
      const store = useStore.getState()
      const studentCountBefore = store.students.length
      const auditLogLengthBefore = store.auditLog.length

      expect(() => {
        useStore.getState().createStudent({
          firstName: 'Denied',
          lastName: 'Student',
          email: 'denied@test.com',
          gender: 'M',
          sede: 'Linda Vista',
          province: 'San Jose',
          canton: 'San Jose',
          educationalLevel: 'primaria',
          guardian: {
            name: 'Encargado Test',
            relationship: 'madre',
            phone: '8888-8888',
            email: 'enc@example.com',
          },
        })
      }).toThrow()

      const storeAfter = useStore.getState()
      expect(storeAfter.students.length).toBe(studentCountBefore)
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore)
    })

    it('teacher cannot update a student', () => {
      useStore.getState().setRole('teacher')
      const existingStudent = useStore.getState().students[0]
      if (!existingStudent) throw new Error('no student in seed')
      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().updateStudent(existingStudent.id, { firstName: 'Hacked' })
      }).toThrow()

      const storeAfter = useStore.getState()
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore)
    })

    it('teacher cannot delete a student', () => {
      useStore.getState().setRole('teacher')
      const existingStudent = useStore.getState().students[0]
      if (!existingStudent) throw new Error('no student in seed')
      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().deleteStudent(existingStudent.id)
      }).toThrow()

      const storeAfter = useStore.getState()
      expect(storeAfter.students.some((s) => s.id === existingStudent.id)).toBe(true)
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore)
    })
  })

  describe('grade guards', () => {
    it('teacher can enter a grade for a published course they own that has ended', () => {
      const store = useStore.getState()

      // Derive a teacher-owned, still-published course that has ended (robust to
      // seed layout), read through the same frozen clock the predicate uses. A
      // closed cohort is excluded — the Teacher is locked out post-close (ADR-0025).
      const now = clock.now()
      const endedCourse = store.courses.find(
        (c) =>
          c.status === 'published' &&
          new Date(c.term.end) <= now &&
          store.teachers.some((t) => t.id === c.teacherId)
      )
      if (!endedCourse) throw new Error('no ended published teacher-owned course in seed')

      // Same-Sede student so the enrollment respects ADR-0011.
      const student = store.students.find((s) => s.sede === endedCourse.sede)
      if (!student) throw new Error('no student at the course Sede')

      // Setup: admin creates enrollment (teachers can't create enrollments)
      useStore.getState().setRole('admin')
      const enrollment = store.enrollments.find(
        (e) => e.studentId === student.id && e.courseId === endedCourse.id
      )
      if (!enrollment) {
        useStore.getState().enrollStudent(student.id, endedCourse.id)
      }

      // Now set to teacher role matching the course owner
      useStore.setState({ currentUserId: endedCourse.teacherId, role: 'teacher' })

      const auditLogLengthBefore = useStore.getState().auditLog.length

      // This should succeed
      const grade = useStore.getState().setGrade(student.id, endedCourse.id, 95)
      expect(grade).toBeDefined()

      const storeAfter = useStore.getState()
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore + 1)
    })

    it('teacher can update an existing grade in a published course they own that has ended', () => {
      const store = useStore.getState()

      const now = clock.now()
      const endedCourse = store.courses.find(
        (c) =>
          c.status === 'published' &&
          new Date(c.term.end) <= now &&
          store.teachers.some((t) => t.id === c.teacherId)
      )
      if (!endedCourse) throw new Error('no ended published teacher-owned course in seed')

      // Same-Sede student so the enrollment respects ADR-0011.
      const student = store.students.find((s) => s.sede === endedCourse.sede)
      if (!student) throw new Error('no student at the course Sede')

      // Setup: admin creates enrollment (teachers can't create enrollments)
      useStore.getState().setRole('admin')
      const enrollment = store.enrollments.find(
        (e) => e.studentId === student.id && e.courseId === endedCourse.id
      )
      if (!enrollment) {
        useStore.getState().enrollStudent(student.id, endedCourse.id)
      }

      useStore.setState({ currentUserId: endedCourse.teacherId, role: 'teacher' })

      // Enter the grade, then re-grade: edit is allowed within own ended courses
      useStore.getState().setGrade(student.id, endedCourse.id, 80)
      const auditLogLengthBefore = useStore.getState().auditLog.length
      useStore.getState().setGrade(student.id, endedCourse.id, 95)

      const after = useStore.getState()
      const grade = after.grades.find(
        (g) => g.studentId === student.id && g.courseId === endedCourse.id
      )
      expect(grade?.score).toBe(95)
      expect(after.auditLog.length).toBe(auditLogLengthBefore + 1)
    })

    it('teacher cannot enter a grade for a course they do not own', () => {
      useStore.getState().setRole('teacher')
      const store = useStore.getState()

      // Find a course NOT owned by tea-1
      const otherCourse = store.courses.find((c) => c.teacherId !== 'tea-1')
      if (!otherCourse) throw new Error('no course not owned by tea-1')

      const student = store.students[0]
      if (!student) throw new Error('no student in seed')

      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().setGrade(student.id, otherCourse.id, 95)
      }).toThrow()

      expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
    })

    it('teacher cannot enter a grade for a course they own that has NOT ended', () => {
      const store = useStore.getState()

      // Derive a teacher-owned course that has NOT ended (robust to seed layout),
      // read through the same frozen clock the predicate uses.
      const now = clock.now()
      const inProgressCourse = store.courses.find(
        (c) => new Date(c.term.end) > now && store.teachers.some((t) => t.id === c.teacherId)
      )
      if (!inProgressCourse) throw new Error('no not-ended teacher-owned course in seed')

      const student = store.students.find(
        (s) => s.sede === inProgressCourse.sede && inProgressCourse.level === s.educationalLevel
      )
      if (!student) throw new Error('no student at the course Sede with matching level')

      // Setup: admin creates enrollment
      useStore.getState().setRole('admin')
      const enrollment = store.enrollments.find(
        (e) => e.studentId === student.id && e.courseId === inProgressCourse.id
      )
      if (!enrollment) {
        useStore.getState().enrollStudent(student.id, inProgressCourse.id)
      }

      // Now set to teacher role matching the course owner
      useStore.setState({ currentUserId: inProgressCourse.teacherId, role: 'teacher' })

      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().setGrade(student.id, inProgressCourse.id, 95)
      }).toThrow()

      expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
    })

    it('admin can enter a grade for any course', () => {
      const store = useStore.getState()

      // Use an in-progress course so no time restrictions
      const course = store.courses.find((c) => c.id === 'cou-4')
      if (!course) throw new Error('no cou-4 in seed')

      const student = store.students.find(
        (s) => s.sede === course.sede && course.level === s.educationalLevel
      )
      if (!student) throw new Error('no student at the course Sede with matching level')

      useStore.getState().setRole('admin')

      // Ensure enrollment exists
      const enrollment = store.enrollments.find(
        (e) => e.studentId === student.id && e.courseId === course.id
      )
      if (!enrollment) {
        useStore.getState().enrollStudent(student.id, course.id)
      }

      const auditLogLengthBefore = useStore.getState().auditLog.length

      const grade = useStore.getState().setGrade(student.id, course.id, 85)
      expect(grade).toBeDefined()

      const storeAfter = useStore.getState()
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore + 1)
    })

    it('locks grades after close: the teacher is denied while an admin reconciles (ADR-0025)', () => {
      const store = useStore.getState()
      const now = clock.now()
      // A published, ended, teacher-owned course with an approved student — closing
      // it will emit that student's Certificate.
      const course = store.courses.find(
        (c) =>
          c.status === 'published' &&
          new Date(c.term.end) <= now &&
          store.teachers.some((t) => t.id === c.teacherId) &&
          store.enrollments.some((e) => e.courseId === c.id && e.status === 'approved')
      )
      if (!course) throw new Error('no published, ended, owned course with an approved enrollment')
      const enrollment = store.enrollments.find(
        (e) => e.courseId === course.id && e.status === 'approved'
      )
      if (!enrollment) throw new Error('expected an approved enrollment')
      const studentId = enrollment.studentId

      // The owning Teacher grades the student passing while the cohort is still open.
      useStore.setState({ currentUserId: course.teacherId, role: 'teacher' })
      useStore.getState().setGrade(studentId, course.id, 90)

      // Admin closes the cohort, emitting the Certificate.
      useStore.getState().setRole('admin')
      useStore.getState().closeCourse(course.id)
      const hasCert = () =>
        useStore
          .getState()
          .certificates.some((c) => c.studentId === studentId && c.courseId === course.id)
      expect(hasCert()).toBe(true)

      const grade = useStore
        .getState()
        .grades.find((g) => g.studentId === studentId && g.courseId === course.id)
      if (!grade) throw new Error('expected a grade')

      // The Teacher can no longer touch the closed cohort's Grades.
      useStore.setState({ currentUserId: course.teacherId, role: 'teacher' })
      expect(() => useStore.getState().updateGradeScore(grade.id, 50)).toThrow(/permission denied/i)
      expect(hasCert()).toBe(true) // the rejected attempt changed nothing

      // The admin's post-close correction flows through reconciliation and revokes it.
      useStore.getState().setRole('admin')
      useStore.getState().updateGradeScore(grade.id, 50)
      expect(hasCert()).toBe(false)
    })
  })

  describe('teacher CRUD guards', () => {
    it('student cannot create a teacher', () => {
      useStore.getState().setRole('student')
      const store = useStore.getState()
      const teacherCountBefore = store.teachers.length
      const auditLogLengthBefore = store.auditLog.length

      expect(() => {
        useStore.getState().createTeacher({
          firstName: 'Fake',
          lastName: 'Teacher',
          email: 'fake@test.com',
          sede: 'Linda Vista',
          province: 'San José',
          canton: 'San José',
        })
      }).toThrow()

      const storeAfter = useStore.getState()
      expect(storeAfter.teachers.length).toBe(teacherCountBefore)
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore)
    })
  })

  describe('course CRUD guards', () => {
    it('student cannot create a course', () => {
      useStore.getState().setRole('student')
      const store = useStore.getState()
      const courseCountBefore = store.courses.length
      const auditLogLengthBefore = store.auditLog.length

      expect(() => {
        useStore.getState().createCourse({
          name: 'Hacked',
          description: 'Nope',
          sede: 'Linda Vista',
          programId: 'prog-1',
          level: 'primaria',
          status: 'published',
          capacity: 20,
          teacherId: 'tea-1',
          term: {
            start: '2026-01-01T00:00:00.000Z',
            end: '2026-03-01T00:00:00.000Z',
          },
          meetingDays: [],
        })
      }).toThrow()

      const storeAfter = useStore.getState()
      expect(storeAfter.courses.length).toBe(courseCountBefore)
      expect(storeAfter.auditLog.length).toBe(auditLogLengthBefore)
    })
  })

  describe('email campaign guards', () => {
    it('teacher can send a course-scoped campaign to a Course they own', () => {
      useStore.getState().setRole('teacher') // tea-1
      const state = useStore.getState()
      const ownCourse = state.courses.find(
        (c) => c.teacherId === state.currentUserId && c.status === 'published'
      )
      if (!ownCourse) throw new Error('seed invariant: teacher persona owns no live Course')
      const before = state.emailCampaigns.length

      const campaign = useStore.getState().sendEmailCampaign({
        subject: 'Class update',
        body: 'A note for this week',
        filter: { kind: 'course', value: ownCourse.id },
        audience: 'both',
        recipientIds: [],
      })

      expect(campaign.audience).toBe('both')
      expect(campaign.sentBy).toBe(state.currentUserId)
      expect(useStore.getState().emailCampaigns.length).toBe(before + 1)
    })

    it('teacher cannot send to a Course they do not own (ADR-0009 re-check)', () => {
      useStore.getState().setRole('teacher') // tea-1
      const state = useStore.getState()
      const otherCourse = state.courses.find((c) => c.teacherId !== state.currentUserId)
      if (!otherCourse) throw new Error('seed invariant: no Course owned by another teacher')
      const auditLogLengthBefore = state.auditLog.length

      expect(() => {
        useStore.getState().sendEmailCampaign({
          subject: 'Test',
          body: 'Body',
          filter: { kind: 'course', value: otherCourse.id },
          audience: 'students',
          recipientIds: [],
        })
      }).toThrow()

      expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
    })

    it('cannot message a closed cohort (ADR-0024 terminal), even for its owner', () => {
      useStore.getState().setRole('teacher') // tea-1
      const state = useStore.getState()
      const ownCourse = state.courses.find(
        (c) => c.teacherId === state.currentUserId && c.status === 'published'
      )
      if (!ownCourse) throw new Error('seed invariant: teacher persona owns no live Course')
      // Close it as admin, then attempt to message it back as its Teacher.
      useStore.getState().setRole('admin')
      useStore.getState().closeCourse(ownCourse.id)
      useStore.getState().setRole('teacher')
      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().sendEmailCampaign({
          subject: 'Test',
          body: 'Body',
          filter: { kind: 'course', value: ownCourse.id },
          audience: 'both',
          recipientIds: [],
        })
      }).toThrow()

      expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
    })

    it('teacher cannot send a broad (non-course) campaign — the form is locked to their Course', () => {
      useStore.getState().setRole('teacher')
      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().sendEmailCampaign({
          subject: 'Test',
          body: 'Body',
          filter: { kind: 'all' },
          audience: 'students',
          recipientIds: [],
        })
      }).toThrow()

      expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
    })
  })
})
