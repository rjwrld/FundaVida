import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

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
          educationalLevel: 'high',
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
    it('teacher can enter a grade for a course they own that has ended', () => {
      const store = useStore.getState()

      // Use cou-3 which is just-ended (ended 8 days ago per the seed)
      const endedCourse = store.courses.find((c) => c.id === 'cou-3')
      if (!endedCourse) throw new Error('no cou-3 in seed')

      // Verify it has ended
      const now = new Date()
      const termEnd = new Date(endedCourse.term.end)
      if (now < termEnd) throw new Error('test setup: cou-3 not ended yet')

      const student = store.students[0]
      if (!student) throw new Error('no student in seed')

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

    it('teacher can update an existing grade in a course they own that has ended', () => {
      const store = useStore.getState()

      const endedCourse = store.courses.find((c) => c.id === 'cou-3')
      if (!endedCourse) throw new Error('no cou-3 in seed')
      if (new Date() < new Date(endedCourse.term.end)) {
        throw new Error('test setup: cou-3 not ended yet')
      }

      const student = store.students[0]
      if (!student) throw new Error('no student in seed')

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

      // Use cou-4 which is in-progress (started 5 weeks ago, ends in 7 weeks)
      const inProgressCourse = store.courses.find((c) => c.id === 'cou-4')
      if (!inProgressCourse) throw new Error('no cou-4 in seed')

      // Verify it hasn't ended
      const now = new Date()
      const termEnd = new Date(inProgressCourse.term.end)
      if (now >= termEnd) {
        throw new Error('test setup: cou-4 already ended')
      }

      const student = store.students[0]
      if (!student) throw new Error('no student in seed')

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

      const student = store.students[0]
      if (!student) throw new Error('no student in seed')

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
          programName: 'Program',
          teacherId: 'tea-1',
          term: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
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
    it('teacher cannot send a bulk email campaign', () => {
      useStore.getState().setRole('teacher')
      const auditLogLengthBefore = useStore.getState().auditLog.length

      expect(() => {
        useStore.getState().sendEmailCampaign({
          subject: 'Test',
          body: 'Body',
          filter: { kind: 'all' },
          recipientIds: [],
        })
      }).toThrow()

      expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
    })
  })
})
