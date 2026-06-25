import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { SEDES } from '@/constants/sede'
import { sessionsFor } from '@/lib/sessions'

describe('useStore', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('seeds students, teachers, courses, enrollments, and grades', () => {
    const s = useStore.getState()
    expect(s.students.length).toBeGreaterThan(0)
    expect(s.teachers.length).toBeGreaterThan(0)
    expect(s.courses.length).toBeGreaterThan(0)
    expect(s.enrollments.length).toBeGreaterThan(0)
    expect(s.grades.length).toBeGreaterThan(0)
  })

  it('setRole persists and updates state', () => {
    useStore.getState().setRole('admin')
    expect(useStore.getState().role).toBe('admin')
    expect(window.localStorage.getItem('fundavida:v2:role')).toBe('admin')
  })

  it('resetDemo clears role and reseeds data', () => {
    useStore.getState().setRole('teacher')
    useStore.getState().resetDemo()
    expect(useStore.getState().role).toBeNull()
    expect(useStore.getState().students.length).toBeGreaterThan(0)
  })

  it('resetDemo clears the persisted role key so a reload does not rehydrate it', () => {
    useStore.getState().setRole('teacher')
    expect(window.localStorage.getItem('fundavida:v2:role')).toBe('teacher')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v2:role')).toBeNull()
  })

  it('resetDemo clears the banner-dismissed flag so the banner reappears', () => {
    window.localStorage.setItem('fundavida:v1:banner-dismissed', '1')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v1:banner-dismissed')).toBeNull()
  })
})

describe('teacher CRUD', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('creates a teacher with id and empty courseIds', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@fv.cr',
      sede: 'Linda Vista',
    })
    expect(created.id).toMatch(/^tea-\d+$/)
    expect(created.courseIds).toEqual([])
    expect(useStore.getState().teachers.some((t) => t.id === created.id)).toBe(true)
  })

  it('updates a teacher patch', () => {
    const { id } = useStore.getState().createTeacher({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      sede: 'Linda Vista',
    })
    useStore.getState().updateTeacher(id, { lastName: 'Changed' })
    expect(useStore.getState().teachers.find((t) => t.id === id)?.lastName).toBe('Changed')
  })

  it('refuses to delete a teacher with assigned courses', () => {
    const tea1 = useStore.getState().teachers.find((t) => t.courseIds.length > 0)
    if (!tea1) throw new Error('no teacher with courses in seed')
    const auditLogLengthBefore = useStore.getState().auditLog.length
    expect(() => useStore.getState().deleteTeacher(tea1.id)).toThrow(/reassign/i)
    expect(useStore.getState().teachers.some((t) => t.id === tea1.id)).toBe(true)
    expect(useStore.getState().auditLog.length).toBe(auditLogLengthBefore)
  })

  it('deletes a teacher with no assigned courses', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Lone',
      lastName: 'Wolf',
      email: 'lone@fv.cr',
      sede: 'Linda Vista',
    })
    useStore.getState().deleteTeacher(created.id)
    expect(useStore.getState().teachers.some((t) => t.id === created.id)).toBe(false)
  })
})

describe('grade admin actions', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('updateGradeScore refreshes score and issuedAt', () => {
    const first = useStore.getState().grades[0]
    if (!first) throw new Error('expected at least one seeded grade')
    const originalIssuedAt = first.issuedAt
    useStore.getState().updateGradeScore(first.id, 88)
    const after = useStore.getState().grades.find((g) => g.id === first.id)
    if (!after) throw new Error('expected updated grade to exist')
    expect(after.score).toBe(88)
    expect(after.issuedAt).not.toBe(originalIssuedAt)
  })

  it('deleteGrade removes only the target grade', () => {
    const first = useStore.getState().grades[0]
    if (!first) throw new Error('expected at least one seeded grade')
    const before = useStore.getState().grades.length
    useStore.getState().deleteGrade(first.id)
    expect(useStore.getState().grades.length).toBe(before - 1)
    expect(useStore.getState().grades.some((g) => g.id === first.id)).toBe(false)
  })
})

describe('attendance cascades', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('deleteStudent removes attendance records for that student', () => {
    const targetRecord = useStore.getState().attendance[0]
    if (!targetRecord) throw new Error('expected at least one seeded attendance record')
    const studentId = targetRecord.studentId
    useStore.getState().deleteStudent(studentId)
    expect(useStore.getState().attendance.some((a) => a.studentId === studentId)).toBe(false)
  })

  it('deleteCourse removes attendance records for that course', () => {
    const targetRecord = useStore.getState().attendance[0]
    if (!targetRecord) throw new Error('expected at least one seeded attendance record')
    const courseId = targetRecord.courseId
    useStore.getState().deleteCourse(courseId)
    expect(useStore.getState().attendance.some((a) => a.courseId === courseId)).toBe(false)
  })

  it('unenrollStudent removes attendance records matching that student+course pair', () => {
    const attendance = useStore.getState().attendance
    const enrollments = useStore.getState().enrollments
    const match = attendance.find((a) =>
      enrollments.some((e) => e.studentId === a.studentId && e.courseId === a.courseId)
    )
    if (!match) throw new Error('expected an attendance record with a matching enrollment')
    const enrollment = enrollments.find(
      (e) => e.studentId === match.studentId && e.courseId === match.courseId
    )
    if (!enrollment) throw new Error('expected matching enrollment to exist')
    useStore.getState().unenrollStudent(enrollment.id)
    expect(
      useStore
        .getState()
        .attendance.some((a) => a.studentId === match.studentId && a.courseId === match.courseId)
    ).toBe(false)
  })
})

describe('tcu cascade on deleteStudent', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('deleteStudent removes tcuActivities for that student', () => {
    const firstActivity = useStore.getState().tcuActivities[0]
    if (!firstActivity) throw new Error('expected at least one seeded tcu activity')
    const studentId = firstActivity.studentId
    useStore.getState().deleteStudent(studentId)
    expect(useStore.getState().tcuActivities.some((a) => a.studentId === studentId)).toBe(false)
  })
})

describe('audit log instrumentation', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('createStudent appends a create entry', () => {
    const before = useStore.getState().auditLog.length
    const created = useStore.getState().createStudent({
      firstName: 'Nova',
      lastName: 'Pine',
      email: 'n@fv.cr',
      gender: 'F',
      sede: 'Linda Vista',
      province: 'X',
      canton: 'Y',
      educationalLevel: 'Primary',
    })
    const log = useStore.getState().auditLog
    expect(log.length).toBe(before + 1)
    expect(log[0]?.action).toBe('create')
    expect(log[0]?.entity).toBe('student')
    expect(log[0]?.entityId).toBe(created.id)
  })

  it('deleteStudent appends a delete entry and cascades', () => {
    const { id } = useStore.getState().createStudent({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      gender: 'F',
      sede: 'Linda Vista',
      province: 'X',
      canton: 'Y',
      educationalLevel: 'Primary',
    })
    useStore.getState().deleteStudent(id)
    const log = useStore.getState().auditLog
    expect(log[0]?.action).toBe('delete')
    expect(log[0]?.entity).toBe('student')
    expect(log[0]?.entityId).toBe(id)
  })

  it('setGrade appends a grade entry', () => {
    const state = useStore.getState()
    const first = state.enrollments[0]
    if (!first) throw new Error('no enrollments in seed')
    useStore.getState().setGrade(first.studentId, first.courseId, 95)
    const log = useStore.getState().auditLog
    expect(log[0]?.action).toBe('grade')
    expect(log[0]?.entity).toBe('grade')
  })

  describe('sendEmailCampaign', () => {
    it('prepends the new campaign to emailCampaigns', () => {
      const before = useStore.getState().emailCampaigns.length
      const campaign = useStore.getState().sendEmailCampaign({
        subject: 'Welcome',
        body: 'Thanks for joining the demo program.',
        filter: { kind: 'all' },
        recipientIds: ['stu-1', 'stu-2'],
      })
      const after = useStore.getState().emailCampaigns
      expect(after.length).toBe(before + 1)
      expect(after[0]?.id).toBe(campaign.id)
    })

    it('writes an audit entry tagged as an emailCampaign create', () => {
      const campaign = useStore.getState().sendEmailCampaign({
        subject: 'Reminders',
        body: 'A quick reminder about upcoming sessions.',
        filter: { kind: 'all' },
        recipientIds: ['stu-1', 'stu-2', 'stu-3'],
      })
      const log = useStore.getState().auditLog
      expect(log[0]?.action).toBe('create')
      expect(log[0]?.entity).toBe('emailCampaign')
      expect(log[0]?.entityId).toBe(campaign.id)
      expect(log[0]?.summary).toContain('Reminders')
      expect(log[0]?.summary).toContain('3')
    })

    it('records actorId as the currentUserId for the active role', () => {
      const currentUserId = useStore.getState().currentUserId
      expect(currentUserId).not.toBeNull()
      useStore.getState().sendEmailCampaign({
        subject: 'Greetings',
        body: 'Just checking in on the cohort.',
        filter: { kind: 'all' },
        recipientIds: ['stu-1'],
      })
      const log = useStore.getState().auditLog
      expect(log[0]?.actorId).toBe(currentUserId)
    })
  })
})

describe('enrollment referential integrity', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('enrollStudent throws on a courseId that does not exist', () => {
    const student = useStore.getState().students[0]
    if (!student) throw new Error('expected at least one seeded student')
    const before = useStore.getState().enrollments.length
    expect(() => useStore.getState().enrollStudent(student.id, 'cou-does-not-exist')).toThrow()
    expect(useStore.getState().enrollments.length).toBe(before)
    expect(
      useStore.getState().students.find((s) => s.id === student.id)?.enrolledCourseIds
    ).not.toContain('cou-does-not-exist')
  })

  it('enrollStudent throws on a studentId that does not exist', () => {
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one seeded course')
    const before = useStore.getState().enrollments.length
    expect(() => useStore.getState().enrollStudent('stu-does-not-exist', course.id)).toThrow()
    expect(useStore.getState().enrollments.length).toBe(before)
  })

  it('enrollStudent throws when the student and course are at different Sedes (ADR-0011)', () => {
    useStore.getState().setRole('admin')
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one seeded course')
    const crossSede = useStore.getState().students.find((s) => s.sede !== course.sede)
    if (!crossSede) throw new Error('expected a student at a different Sede')
    const before = useStore.getState().enrollments.length
    expect(() => useStore.getState().enrollStudent(crossSede.id, course.id)).toThrow()
    expect(useStore.getState().enrollments.length).toBe(before)
    expect(
      useStore.getState().students.find((s) => s.id === crossSede.id)?.enrolledCourseIds
    ).not.toContain(course.id)
  })

  it('enrollStudent succeeds when the student and course share a Sede', () => {
    useStore.getState().setRole('admin')
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one seeded course')
    const enrolledIds = new Set(
      useStore
        .getState()
        .enrollments.filter((e) => e.courseId === course.id)
        .map((e) => e.studentId)
    )
    const sameSede = useStore
      .getState()
      .students.find((s) => s.sede === course.sede && !enrolledIds.has(s.id))
    if (!sameSede) throw new Error('expected an unenrolled student at the same Sede')
    const before = useStore.getState().enrollments.length
    const enrollment = useStore.getState().enrollStudent(sameSede.id, course.id)
    expect(enrollment.courseId).toBe(course.id)
    expect(useStore.getState().enrollments.length).toBe(before + 1)
  })
})

describe('attendance marking', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('markAttendance creates a new record if none exists for (courseId, studentId, sessionDate)', () => {
    useStore.getState().setRole('admin')
    const state = useStore.getState()
    const course = state.courses[0]
    if (!course) throw new Error('expected at least one course')
    const enrollment = state.enrollments.find((e) => e.courseId === course.id)
    if (!enrollment) throw new Error('expected at least one enrollment in the course')
    const sessions = sessionsFor(course)
    const sessionWithoutRecord = sessions.find(
      (s) =>
        !state.attendance.some(
          (a) => a.studentId === enrollment.studentId && a.sessionDate === s.date
        )
    )
    if (!sessionWithoutRecord) throw new Error('expected a session without an attendance record')
    const logLengthBefore = state.auditLog.length
    const attendanceLengthBefore = state.attendance.length
    const created = useStore
      .getState()
      .markAttendance(course.id, enrollment.studentId, sessionWithoutRecord.date, 'present')
    expect(created.courseId).toBe(course.id)
    expect(created.studentId).toBe(enrollment.studentId)
    expect(created.sessionDate).toBe(sessionWithoutRecord.date)
    expect(created.status).toBe('present')
    expect(useStore.getState().attendance.length).toBe(attendanceLengthBefore + 1)
    expect(useStore.getState().auditLog.length).toBe(logLengthBefore + 1)
    expect(useStore.getState().auditLog[0]?.action).toBe('create')
  })

  it('markAttendance updates an existing record for (courseId, studentId, sessionDate)', () => {
    useStore.getState().setRole('admin')
    const state = useStore.getState()
    const existing = state.attendance.find((a) => a.status === 'present')
    if (!existing) throw new Error('expected an attendance record to update')
    const logLengthBefore = state.auditLog.length
    const updated = useStore
      .getState()
      .markAttendance(existing.courseId, existing.studentId, existing.sessionDate, 'absent')
    const log = useStore.getState().auditLog
    expect(updated.status).toBe('absent')
    expect(log.length).toBe(logLengthBefore + 1)
    expect(log[0]?.action).toBe('update')
    expect(log[0]?.entity).toBe('attendance')
  })

  it('markAttendance throws if student-teacher course-ownership mismatch (teacher)', () => {
    useStore.getState().setRole('teacher')
    const state = useStore.getState()
    const record = state.attendance[0]
    if (!record) throw new Error('expected at least one attendance record')
    const course = state.courses.find((c) => c.id === record.courseId)
    if (!course) throw new Error('expected course to exist')
    if (course.teacherId === 'tea-1') {
      // If tea-1 owns this course, find a record for a course tea-1 doesn't own
      const otherRecord = state.attendance.find(
        (a) => !state.courses.find((c) => c.id === a.courseId && c.teacherId === 'tea-1')
      )
      if (!otherRecord) throw new Error('expected a record for a course not owned by tea-1')
      const logLengthBefore = state.auditLog.length
      expect(() =>
        useStore
          .getState()
          .markAttendance(
            otherRecord.courseId,
            otherRecord.studentId,
            otherRecord.sessionDate,
            'absent'
          )
      ).toThrow()
      expect(state.auditLog.length).toBe(logLengthBefore)
    }
  })

  it('markAttendance succeeds for teacher-owned course sessions', () => {
    useStore.getState().setRole('teacher')
    const state = useStore.getState()
    const ownedCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    const ownedRecord = state.attendance.find((a) => ownedCourseIds.has(a.courseId))
    if (!ownedRecord) throw new Error('expected an attendance record for a teacher-owned course')
    const updated = useStore
      .getState()
      .markAttendance(
        ownedRecord.courseId,
        ownedRecord.studentId,
        ownedRecord.sessionDate,
        'absent'
      )
    expect(updated.status).toBe('absent')
  })
})

describe('course Sede invariant (ADR-0011)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  function courseInput(sede: (typeof SEDES)[number], teacherId: string) {
    const template = useStore.getState().courses[0]
    if (!template) throw new Error('expected at least one seeded course')
    return {
      name: 'Sede Test',
      description: 'A course under test',
      sede,
      programName: 'Literacy',
      teacherId,
      term: template.term,
      meetingDays: template.meetingDays,
    }
  }

  it('createCourse throws when the Teacher is at a different Sede', () => {
    const teacher = useStore.getState().teachers[0]
    if (!teacher) throw new Error('expected at least one seeded teacher')
    const otherSede = SEDES.find((s) => s !== teacher.sede)
    if (!otherSede) throw new Error('expected a second Sede')
    const before = useStore.getState().courses.length
    expect(() => useStore.getState().createCourse(courseInput(otherSede, teacher.id))).toThrow()
    expect(useStore.getState().courses.length).toBe(before)
  })

  it('createCourse succeeds when the Teacher shares the Course Sede', () => {
    const teacher = useStore.getState().teachers[0]
    if (!teacher) throw new Error('expected at least one seeded teacher')
    const before = useStore.getState().courses.length
    const created = useStore.getState().createCourse(courseInput(teacher.sede, teacher.id))
    expect(created.sede).toBe(teacher.sede)
    expect(useStore.getState().courses.length).toBe(before + 1)
  })

  it('updateCourse throws when reassigning to a Teacher at a different Sede', () => {
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one seeded course')
    const crossSedeTeacher = useStore.getState().teachers.find((t) => t.sede !== course.sede)
    if (!crossSedeTeacher) throw new Error('expected a teacher at a different Sede')
    expect(() =>
      useStore.getState().updateCourse(course.id, { teacherId: crossSedeTeacher.id })
    ).toThrow()
    expect(useStore.getState().courses.find((c) => c.id === course.id)?.teacherId).toBe(
      course.teacherId
    )
  })
})
