import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('audit log characterization', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    // Clear audit log from seed to start fresh for characterization tests
    useStore.setState({ auditLog: [], currentUserId: null })
    useStore.getState().setRole('admin')
  })

  describe('audit entry construction invariants', () => {
    it('audit log entries are prepended (newest first)', () => {
      let store = useStore.getState()
      const initialLength = store.auditLog.length

      store.createStudent({
        firstName: 'Alice',
        lastName: 'A',
        email: 'a@test.com',
        gender: 'F',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog.length).toBe(initialLength + 1)
      const afterFirst = store.auditLog[0]

      store.createStudent({
        firstName: 'Bob',
        lastName: 'B',
        email: 'b@test.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog.length).toBe(initialLength + 2)
      const afterSecond = store.auditLog[0]

      // Verify prepend: Alice's entry moved from [0] to [1]
      expect(afterSecond?.summary).toContain('Bob')
      expect(afterFirst?.summary).toContain('Alice')
      expect(store.auditLog[1]).toBe(afterFirst)
    })

    it('audit entry id follows log-N pattern', () => {
      let store = useStore.getState()
      store.createStudent({
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.id).toMatch(/^log-\d+$/)
    })

    it('audit entry timestamp is valid ISO 8601', () => {
      let store = useStore.getState()
      store.createStudent({
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      const timestamp = store.auditLog[0]?.timestamp
      expect(timestamp).toBeDefined()
      if (timestamp) {
        const parsed = new Date(timestamp)
        expect(!isNaN(parsed.getTime())).toBe(true)
        expect(timestamp).toBe(parsed.toISOString())
      }
    })

    it('audit entry actorId equals currentUserId when set', () => {
      useStore.setState({ currentUserId: 'user-123' })
      let store = useStore.getState()
      store.createStudent({
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.actorId).toBe('user-123')
    })

    it('audit entry actorId is "system" when currentUserId is null', () => {
      useStore.setState({ currentUserId: null })
      let store = useStore.getState()
      store.createStudent({
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.actorId).toBe('system')
    })

    it('audit entry actorId is "system" when currentUserId is undefined', () => {
      useStore.setState({ currentUserId: undefined as never })
      let store = useStore.getState()
      store.createStudent({
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.actorId).toBe('system')
    })
  })

  describe('createStudent audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const student = store.createStudent({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@test.com',
        gender: 'F',
        sede: 'Linda Vista',
        province: 'San Jose',
        canton: 'Central',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('create')
      expect(store.auditLog[0]?.entity).toBe('student')
      expect(store.auditLog[0]?.entityId).toBe(student.id)
      expect(store.auditLog[0]?.summary).toBe(`Created student Alice Smith`)
    })
  })

  describe('updateStudent audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const student = store.createStudent({
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@test.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'Alajuela',
        canton: 'Central',
        educationalLevel: 'primaria',
      })
      store.updateStudent(student.id, { lastName: 'Changed' })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('update')
      expect(store.auditLog[0]?.entity).toBe('student')
      expect(store.auditLog[0]?.entityId).toBe(student.id)
      expect(store.auditLog[0]?.summary).toBe(`Updated student ${student.id}`)
    })
  })

  describe('deleteStudent audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const student = store.createStudent({
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol@test.com',
        gender: 'F',
        sede: 'Linda Vista',
        province: 'Heredia',
        canton: 'Central',
        educationalLevel: 'secundaria',
      })
      const studentId = student.id
      store.deleteStudent(studentId)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('delete')
      expect(store.auditLog[0]?.entity).toBe('student')
      expect(store.auditLog[0]?.entityId).toBe(studentId)
      expect(store.auditLog[0]?.summary).toBe(`Deleted student ${studentId}`)
    })
  })

  describe('createCourse audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const teacher = store.createTeacher({
        firstName: 'Dr.',
        lastName: 'Professor',
        email: 'prof@test.com',
        sede: 'Linda Vista',
      })
      const course = store.createCourse({
        name: 'Mathematics 101',
        description: 'Intro to Math',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'both',
        status: 'published',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2024-01-01', end: '2024-06-30' },
        meetingDays: ['mon', 'wed', 'fri'],
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('create')
      expect(store.auditLog[0]?.entity).toBe('course')
      expect(store.auditLog[0]?.entityId).toBe(course.id)
      expect(store.auditLog[0]?.summary).toBe(`Created course Mathematics 101`)
    })
  })

  describe('updateCourse audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const teacher = store.createTeacher({
        firstName: 'Dr.',
        lastName: 'Professor',
        email: 'prof@test.com',
        sede: 'Linda Vista',
      })
      const course = store.createCourse({
        name: 'Math 101',
        description: 'Intro',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'both',
        status: 'published',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2024-01-01', end: '2024-06-30' },
        meetingDays: ['tue'],
      })
      store.updateCourse(course.id, { name: 'Math 102' })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('update')
      expect(store.auditLog[0]?.entity).toBe('course')
      expect(store.auditLog[0]?.entityId).toBe(course.id)
      expect(store.auditLog[0]?.summary).toBe(`Updated course ${course.id}`)
    })

    it('appends audit entry when teacher is reassigned', () => {
      let store = useStore.getState()
      const teacher1 = store.createTeacher({
        firstName: 'Dr.',
        lastName: 'One',
        email: 'one@test.com',
        sede: 'Linda Vista',
      })
      const teacher2 = store.createTeacher({
        firstName: 'Dr.',
        lastName: 'Two',
        email: 'two@test.com',
        sede: 'Linda Vista',
      })
      const course = store.createCourse({
        name: 'Math 101',
        description: 'Intro',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'both',
        status: 'published',
        capacity: 20,
        teacherId: teacher1.id,
        term: { start: '2024-01-01', end: '2024-06-30' },
        meetingDays: ['mon'],
      })
      store.updateCourse(course.id, { teacherId: teacher2.id })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('update')
      expect(store.auditLog[0]?.entity).toBe('course')
      expect(store.auditLog[0]?.entityId).toBe(course.id)
      expect(store.auditLog[0]?.summary).toBe(`Updated course ${course.id}`)
    })
  })

  describe('deleteCourse audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const teacher = store.createTeacher({
        firstName: 'Dr.',
        lastName: 'Professor',
        email: 'prof@test.com',
        sede: 'Linda Vista',
      })
      const course = store.createCourse({
        name: 'Math 101',
        description: 'Intro',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'both',
        status: 'published',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2024-01-01', end: '2024-06-30' },
        meetingDays: ['wed'],
      })
      const courseId = course.id
      store.deleteCourse(courseId)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('delete')
      expect(store.auditLog[0]?.entity).toBe('course')
      expect(store.auditLog[0]?.entityId).toBe(courseId)
      expect(store.auditLog[0]?.summary).toBe(`Deleted course ${courseId}`)
    })
  })

  describe('createTeacher audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const teacher = store.createTeacher({
        firstName: 'John',
        lastName: 'Educator',
        email: 'john@test.com',
        sede: 'Linda Vista',
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('create')
      expect(store.auditLog[0]?.entity).toBe('teacher')
      expect(store.auditLog[0]?.entityId).toBe(teacher.id)
      expect(store.auditLog[0]?.summary).toBe(`Created teacher John Educator`)
    })
  })

  describe('updateTeacher audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const teacher = store.createTeacher({
        firstName: 'Jane',
        lastName: 'Tutor',
        email: 'jane@test.com',
        sede: 'Linda Vista',
      })
      store.updateTeacher(teacher.id, { lastName: 'Modified' })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('update')
      expect(store.auditLog[0]?.entity).toBe('teacher')
      expect(store.auditLog[0]?.entityId).toBe(teacher.id)
      expect(store.auditLog[0]?.summary).toBe(`Updated teacher ${teacher.id}`)
    })
  })

  describe('deleteTeacher audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const teacher = store.createTeacher({
        firstName: 'Lonely',
        lastName: 'Teacher',
        email: 'lonely@test.com',
        sede: 'Linda Vista',
      })
      const teacherId = teacher.id
      store.deleteTeacher(teacherId)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('delete')
      expect(store.auditLog[0]?.entity).toBe('teacher')
      expect(store.auditLog[0]?.entityId).toBe(teacherId)
      expect(store.auditLog[0]?.summary).toBe(`Deleted teacher ${teacherId}`)
    })

    it('throws and does not append audit entry when teacher has assigned courses', () => {
      let store = useStore.getState()
      // Create a new teacher to make test self-sufficient
      const teacher = store.createTeacher({
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'test@test.com',
        sede: 'Linda Vista',
      })
      store = useStore.getState()
      // Create a course for the teacher
      store.createCourse({
        name: 'Test Course',
        description: 'Test',
        sede: 'Linda Vista',
        programId: 'prog-1',
        level: 'both',
        status: 'published',
        capacity: 20,
        teacherId: teacher.id,
        term: { start: '2024-01-01', end: '2024-06-30' },
        meetingDays: ['mon'],
      })
      store = useStore.getState()
      const auditLogLengthBefore = store.auditLog.length
      // Now attempt to delete the teacher (should fail because they have a course)
      expect(() => store.deleteTeacher(teacher.id)).toThrow(/reassign/i)
      store = useStore.getState()
      // Verify audit log unchanged by the failed delete
      expect(store.auditLog.length).toBe(auditLogLengthBefore)
      // Verify the top entry is the course creation, not a delete-teacher entry
      expect(store.auditLog[0]?.entity).not.toBe('teacher')
      expect(store.auditLog[0]?.action).not.toBe('delete')
    })
  })

  describe('enrollStudent audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const student = store.students[0]
      const course = store.courses[0]
      if (!student || !course) throw new Error('no student or course in seed')
      // Unenroll if already enrolled to start fresh
      const existingEnrollment = store.enrollments.find(
        (e) => e.studentId === student.id && e.courseId === course.id
      )
      if (existingEnrollment) {
        store.unenrollStudent(existingEnrollment.id)
        store = useStore.getState()
      }
      const enrollment = store.enrollStudent(student.id, course.id)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('enroll')
      expect(store.auditLog[0]?.entity).toBe('enrollment')
      expect(store.auditLog[0]?.entityId).toBe(enrollment.id)
      expect(store.auditLog[0]?.summary).toBe(`Enrolled ${student.id} in ${course.id}`)
    })

    it('does not append duplicate audit entry if already enrolled', () => {
      let store = useStore.getState()
      const student = store.students[0]
      const course = store.courses[0]
      if (!student || !course) throw new Error('no student or course in seed')
      const existingEnrollment = store.enrollments.find(
        (e) => e.studentId === student.id && e.courseId === course.id
      )
      if (existingEnrollment) {
        store.unenrollStudent(existingEnrollment.id)
        store = useStore.getState()
      }
      store.enrollStudent(student.id, course.id)
      store = useStore.getState()
      const logLengthAfterFirst = store.auditLog.length
      store.enrollStudent(student.id, course.id)
      store = useStore.getState()
      expect(store.auditLog.length).toBe(logLengthAfterFirst)
    })
  })

  describe('unenrollStudent audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const enrollment = store.enrollments[0]
      if (!enrollment) throw new Error('no enrollment in seed')
      const enrollmentId = enrollment.id
      const studentId = enrollment.studentId
      const courseId = enrollment.courseId
      store.unenrollStudent(enrollmentId)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('unenroll')
      expect(store.auditLog[0]?.entity).toBe('enrollment')
      expect(store.auditLog[0]?.entityId).toBe(enrollmentId)
      expect(store.auditLog[0]?.summary).toBe(`Unenrolled ${studentId} from ${courseId}`)
    })
  })

  describe('setGrade (creating new grade) audit entry', () => {
    it('appends audit entry with action "grade", entity "grade", and correct summary', () => {
      let store = useStore.getState()
      const student = store.students[0]
      const course = store.courses.find(
        (c) => !store.grades.some((g) => g.studentId === student?.id && g.courseId === c.id)
      )
      if (!student || !course) throw new Error('no suitable student or course')
      const grade = store.setGrade(student.id, course.id, 85)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('grade')
      expect(store.auditLog[0]?.entity).toBe('grade')
      expect(store.auditLog[0]?.entityId).toBe(grade.id)
      expect(store.auditLog[0]?.summary).toBe(`Graded ${student.id} in ${course.id} with 85`)
    })
  })

  describe('setGrade (updating existing grade) audit entry', () => {
    it('appends audit entry with action "grade" and updated score summary', () => {
      let store = useStore.getState()
      const grade = store.grades[0]
      if (!grade) throw new Error('no grade in seed')
      const oldScore = grade.score
      const newScore = oldScore === 90 ? 75 : 90
      store.setGrade(grade.studentId, grade.courseId, newScore)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('grade')
      expect(store.auditLog[0]?.entity).toBe('grade')
      expect(store.auditLog[0]?.entityId).toBe(grade.id)
      expect(store.auditLog[0]?.summary).toBe(
        `Updated grade for ${grade.studentId} in ${grade.courseId} to ${newScore}`
      )
    })
  })

  describe('updateGradeScore audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const grade = store.grades[0]
      if (!grade) throw new Error('no grade in seed')
      const newScore = grade.score === 85 ? 95 : 85
      store.updateGradeScore(grade.id, newScore)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('update')
      expect(store.auditLog[0]?.entity).toBe('grade')
      expect(store.auditLog[0]?.entityId).toBe(grade.id)
      expect(store.auditLog[0]?.summary).toBe(`Updated grade ${grade.id} to ${newScore}`)
    })
  })

  describe('deleteGrade audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const grade = store.grades[0]
      if (!grade) throw new Error('no grade in seed')
      const gradeId = grade.id
      store.deleteGrade(gradeId)
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('delete')
      expect(store.auditLog[0]?.entity).toBe('grade')
      expect(store.auditLog[0]?.entityId).toBe(gradeId)
      expect(store.auditLog[0]?.summary).toBe(`Deleted grade ${gradeId}`)
    })
  })

  describe('sendEmailCampaign audit entry', () => {
    it('appends audit entry with correct action, entity, entityId, and summary', () => {
      let store = useStore.getState()
      const campaign = store.sendEmailCampaign({
        subject: 'Important Update',
        body: 'Please read this message',
        filter: { kind: 'all' },
        recipientIds: ['stu-1', 'stu-2', 'stu-3'],
      })
      store = useStore.getState()
      expect(store.auditLog[0]?.action).toBe('create')
      expect(store.auditLog[0]?.entity).toBe('emailCampaign')
      expect(store.auditLog[0]?.entityId).toBe(campaign.id)
      expect(store.auditLog[0]?.summary).toBe(`Sent email "Important Update" to 3 recipients`)
    })
  })

  describe('non-audited mutations', () => {
    it('setRole does not append audit entry', () => {
      let store = useStore.getState()
      const lengthBefore = store.auditLog.length
      store.setRole('teacher')
      store = useStore.getState()
      expect(store.auditLog.length).toBe(lengthBefore)
    })

    it('setLocale does not append audit entry', () => {
      let store = useStore.getState()
      const lengthBefore = store.auditLog.length
      store.setLocale('es')
      store = useStore.getState()
      expect(store.auditLog.length).toBe(lengthBefore)
    })

    it('resetDemo replaces audit log entirely', () => {
      let store = useStore.getState()
      const student = store.createStudent({
        firstName: 'Test',
        lastName: 'Student',
        email: 'test@test.com',
        gender: 'M',
        sede: 'Linda Vista',
        province: 'p',
        canton: 'c',
        educationalLevel: 'primaria',
      })
      store = useStore.getState()
      // Verify the create student entry exists in audit log
      const auditLogBefore = store.auditLog
      const createdStudentEntry = auditLogBefore.find(
        (e) => e.entityId === student.id && e.action === 'create' && e.entity === 'student'
      )
      expect(createdStudentEntry).toBeDefined()

      useStore.getState().resetDemo()
      store = useStore.getState()
      // After resetDemo, the audit log is replaced with the seed's log
      // The new student we created should NOT be in the refreshed log
      const createdStudentEntryAfterReset = store.auditLog.find(
        (e) => e.entityId === student.id && e.action === 'create' && e.entity === 'student'
      )
      expect(createdStudentEntryAfterReset).toBeUndefined()
    })
  })
})
