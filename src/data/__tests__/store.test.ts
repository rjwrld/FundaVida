import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

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
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('admin')
  })

  it('resetDemo clears role and reseeds data', () => {
    useStore.getState().setRole('teacher')
    useStore.getState().resetDemo()
    expect(useStore.getState().role).toBeNull()
    expect(useStore.getState().students.length).toBeGreaterThan(0)
  })

  it('resetDemo clears the persisted role key so a reload does not rehydrate it', () => {
    useStore.getState().setRole('teacher')
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('teacher')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v1:role')).toBeNull()
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
  })

  it('creates a teacher with id and empty courseIds', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@fv.cr',
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
    })
    useStore.getState().updateTeacher(id, { lastName: 'Changed' })
    expect(useStore.getState().teachers.find((t) => t.id === id)?.lastName).toBe('Changed')
  })

  it('refuses to delete a teacher with assigned courses', () => {
    const tea1 = useStore.getState().teachers.find((t) => t.courseIds.length > 0)
    if (!tea1) throw new Error('no teacher with courses in seed')
    expect(() => useStore.getState().deleteTeacher(tea1.id)).toThrow(/reassign/i)
    expect(useStore.getState().teachers.some((t) => t.id === tea1.id)).toBe(true)
  })

  it('deletes a teacher with no assigned courses', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Lone',
      lastName: 'Wolf',
      email: 'lone@fv.cr',
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
})
