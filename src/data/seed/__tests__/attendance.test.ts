import { describe, it, expect, beforeEach } from 'vitest'
import { seedAttendance } from '../attendance'
import { seedCourses } from '../courses'
import { seedStudents } from '../students'
import { seedTeachers } from '../teachers'
import { seedEnrollments } from '../enrollments'
import { findSession } from '@/lib/sessions'
import { startOfDay } from 'date-fns'

describe('seedAttendance', () => {
  let courses: ReturnType<typeof seedCourses>
  let students: ReturnType<typeof seedStudents>
  let enrollments: ReturnType<typeof seedEnrollments>

  beforeEach(() => {
    const teachers = seedTeachers()
    const teacherIds = teachers.map((t) => t.id)
    courses = seedCourses(teacherIds)
    students = seedStudents()
    const studentIds = students.map((s) => s.id)
    const courseIds = courses.map((c) => c.id)
    enrollments = seedEnrollments(studentIds, courseIds)
  })

  it('every attendance record sessionDate binds to a real session of its course', () => {
    const records = seedAttendance(enrollments, courses)

    records.forEach((record) => {
      const course = courses.find((c) => c.id === record.courseId)
      expect(course).toBeDefined()
      if (!course) throw new Error('course not found')

      const session = findSession(course, record.sessionDate)
      expect(session).not.toBeNull()
      expect(session?.courseId).toBe(record.courseId)
    })
  })

  it('attendance record dates are strictly before today (in the past)', () => {
    const records = seedAttendance(enrollments, courses)
    const today = startOfDay(new Date())

    records.forEach((record) => {
      const recordDate = startOfDay(new Date(record.sessionDate))
      expect(recordDate.getTime()).toBeLessThan(today.getTime())
    })
  })

  it('upcoming course (course 8) has zero attendance records', () => {
    const records = seedAttendance(enrollments, courses)
    const upcomingCourse = courses[7] // 0-indexed, course 8 is upcoming
    expect(upcomingCourse).toBeDefined()
    if (!upcomingCourse) throw new Error('upcoming course not found')

    const recordsForUpcoming = records.filter((r) => r.courseId === upcomingCourse.id)
    expect(recordsForUpcoming).toHaveLength(0)
  })

  it('completed courses have attendance records', () => {
    const records = seedAttendance(enrollments, courses)
    const completedCourse = courses[0] // course 1 is completed
    expect(completedCourse).toBeDefined()
    if (!completedCourse) throw new Error('completed course not found')

    const recordsForCompleted = records.filter((r) => r.courseId === completedCourse.id)
    expect(recordsForCompleted.length).toBeGreaterThan(0)
  })

  it('caps records per course at 10 most recent past sessions', () => {
    const records = seedAttendance(enrollments, courses)

    // For each course, verify that no enrollment has more than 10 records
    enrollments.forEach((enrollment) => {
      const enrollmentRecords = records.filter(
        (r) => r.courseId === enrollment.courseId && r.studentId === enrollment.studentId
      )
      expect(enrollmentRecords.length).toBeLessThanOrEqual(10)
    })
  })
})
