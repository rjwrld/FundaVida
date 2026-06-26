import { describe, it, expect } from 'vitest'
import { differenceInDays, isBefore, startOfDay, subDays } from 'date-fns'
import { seedDemo } from '@/data/seed'
import { dashboardStatDeltas, TRAILING_WINDOW_DAYS } from '@/lib/stats'
import { findSession, sessionsFor } from '@/lib/sessions'
import { resolveRecipients } from '@/lib/emailRecipients'
import { PROGRAMS } from '@/constants/course'
import { SEDES } from '@/constants/sede'
import { EDUCATIONAL_LEVELS, PROVINCES } from '@/constants/student'

// A fixed Demo Epoch keeps assertions deterministic. Per ADR-0002 all seeded
// dates float relative to whatever epoch is passed in, so we assert relative
// to this value rather than pinned calendar strings.
const EPOCH = new Date('2026-06-23T12:00:00.000Z')

describe('seedDemo — causal seed story', () => {
  it('builds the world in one call, with every core collection populated', () => {
    const world = seedDemo(EPOCH)

    expect(world.teachers.length).toBeGreaterThan(0)
    expect(world.courses.length).toBeGreaterThan(0)
    expect(world.students.length).toBeGreaterThan(0)
    expect(world.enrollments.length).toBeGreaterThan(0)
    expect(world.attendance.length).toBeGreaterThan(0)
  })

  it('wires back-references: teachers own their courses, students list their enrollments', () => {
    const world = seedDemo(EPOCH)

    world.courses.forEach((course) => {
      const teacher = world.teachers.find((t) => t.id === course.teacherId)
      expect(teacher).toBeDefined()
      expect(teacher?.courseIds).toContain(course.id)
    })

    world.enrollments.forEach((enrollment) => {
      const student = world.students.find((s) => s.id === enrollment.studentId)
      expect(student).toBeDefined()
      expect(student?.enrolledCourseIds).toContain(enrollment.courseId)
    })
  })

  it('records no attendance for a course whose term has not started', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)

    const upcoming = world.courses.filter((c) =>
      isBefore(epochDay, startOfDay(new Date(c.term.start)))
    )
    expect(upcoming.length).toBeGreaterThan(0)

    upcoming.forEach((course) => {
      expect(
        sessionsFor(course).every((s) => isBefore(epochDay, startOfDay(new Date(s.date))))
      ).toBe(true)
      expect(world.attendance.some((a) => a.courseId === course.id)).toBe(false)
    })
  })
})

describe('seedDemo — attendance binds to real Sessions (ADR-0001)', () => {
  it('every attendance record lands on a real derived Session of its Course, in the past', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    expect(world.attendance.length).toBeGreaterThan(0)
    world.attendance.forEach((record) => {
      const course = courseById.get(record.courseId)
      if (!course) throw new Error(`no course for attendance record ${record.id}`)
      const session = findSession(course, record.sessionDate)
      expect(session).not.toBeNull()
      expect(isBefore(startOfDay(new Date(record.sessionDate)), epochDay)).toBe(true)
    })
  })

  it('only records attendance for students actually enrolled in the Course', () => {
    const world = seedDemo(EPOCH)
    const enrolledPairs = new Set(world.enrollments.map((e) => `${e.studentId}:${e.courseId}`))

    world.attendance.forEach((record) => {
      expect(enrolledPairs.has(`${record.studentId}:${record.courseId}`)).toBe(true)
    })
  })
})

describe('seedDemo — Grades exist only for ended Terms', () => {
  it('every Grade belongs to a Course whose Term ended before the epoch', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    expect(world.grades.length).toBeGreaterThan(0)
    world.grades.forEach((grade) => {
      const course = courseById.get(grade.courseId)
      if (!course) throw new Error(`no course for grade ${grade.id}`)
      expect(isBefore(startOfDay(new Date(course.term.end)), epochDay)).toBe(true)
    })
  })

  it("leaves the teacher persona's just-ended Course ungraded (golden-path runway)", () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)

    const justEnded = world.courses.filter((c) => {
      const end = startOfDay(new Date(c.term.end))
      return isBefore(end, epochDay) && differenceInDays(epochDay, end) <= 14
    })
    expect(justEnded).toHaveLength(1)

    const course = justEnded[0]
    if (!course) throw new Error('expected exactly one just-ended course')
    expect(course.teacherId).toBe('tea-1')
    expect(world.enrollments.some((e) => e.courseId === course.id)).toBe(true)
    expect(world.grades.some((g) => g.courseId === course.id)).toBe(false)
  })
})

describe('seedDemo — causal date ordering', () => {
  it('issues every Grade on/after its enrollment, which is on/after the student was created', () => {
    const world = seedDemo(EPOCH)
    const studentById = new Map(world.students.map((s) => [s.id, s]))

    expect(world.grades.length).toBeGreaterThan(0)
    world.grades.forEach((grade) => {
      const student = studentById.get(grade.studentId)
      const enrollment = world.enrollments.find(
        (e) => e.studentId === grade.studentId && e.courseId === grade.courseId
      )
      if (!student) throw new Error(`no student behind grade ${grade.id}`)
      if (!enrollment) throw new Error(`no enrollment behind grade ${grade.id}`)

      const created = new Date(student.createdAt).getTime()
      const enrolled = new Date(enrollment.enrolledAt).getTime()
      const issued = new Date(grade.issuedAt).getTime()
      expect(enrolled).toBeGreaterThanOrEqual(created)
      expect(issued).toBeGreaterThanOrEqual(enrolled)
    })
  })

  it('anchors the graded story on both personas (stu-1 has a Grade, tea-1 owns a graded Course)', () => {
    const world = seedDemo(EPOCH)
    expect(world.grades.some((g) => g.studentId === 'stu-1')).toBe(true)
    const tea1CourseIds = new Set(
      world.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    expect(world.grades.some((g) => tea1CourseIds.has(g.courseId))).toBe(true)
  })
})

describe('seedDemo — audit log is complete by construction', () => {
  it('emits one create/enroll/grade entry per seeded event, each at the event own timestamp', () => {
    const world = seedDemo(EPOCH)

    const hasEntry = (
      action: string,
      entity: string,
      entityId: string,
      timestamp: string
    ): boolean =>
      world.auditLog.some(
        (e) =>
          e.action === action &&
          e.entity === entity &&
          e.entityId === entityId &&
          e.timestamp === timestamp
      )

    world.teachers.forEach((t) => {
      expect(hasEntry('create', 'teacher', t.id, t.createdAt)).toBe(true)
    })
    world.students.forEach((s) => {
      expect(hasEntry('create', 'student', s.id, s.createdAt)).toBe(true)
    })
    world.courses.forEach((c) => {
      expect(hasEntry('create', 'course', c.id, c.createdAt)).toBe(true)
    })
    world.enrollments.forEach((e) => {
      expect(hasEntry('enroll', 'enrollment', e.id, e.enrolledAt)).toBe(true)
    })
    world.grades.forEach((g) => {
      expect(hasEntry('grade', 'grade', g.id, g.issuedAt)).toBe(true)
    })
  })

  it('attributes each Grade entry to the Course teacher who issued it', () => {
    const world = seedDemo(EPOCH)
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    world.grades.forEach((grade) => {
      const entry = world.auditLog.find(
        (e) => e.action === 'grade' && e.entity === 'grade' && e.entityId === grade.id
      )
      const course = courseById.get(grade.courseId)
      if (!entry) throw new Error(`no audit entry for grade ${grade.id}`)
      if (!course) throw new Error(`no course for grade ${grade.id}`)
      expect(entry.actorId).toBe(course.teacherId)
    })
  })

  it('is ordered newest-first', () => {
    const log = seedDemo(EPOCH).auditLog
    for (let i = 1; i < log.length; i += 1) {
      const prev = log[i - 1]
      const curr = log[i]
      if (!prev || !curr) continue
      expect(new Date(prev.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(curr.timestamp).getTime()
      )
    }
  })
})

describe('seedDemo — email campaigns reuse the Bulk Email recipient resolution', () => {
  it('stores exactly the recipients each filter resolves to', () => {
    const world = seedDemo(EPOCH)
    expect(world.emailCampaigns.length).toBeGreaterThan(0)

    const input = {
      students: world.students,
      courses: world.courses,
      enrollments: world.enrollments,
    }
    world.emailCampaigns.forEach((campaign) => {
      const resolved = resolveRecipients(campaign.filter, input)
        .map((s) => s.id)
        .sort()
      expect([...campaign.recipientIds].sort()).toEqual(resolved)
    })
  })

  it('only filters on programs that actually exist (no phantom Culinary)', () => {
    const world = seedDemo(EPOCH)
    const programs = new Set(world.courses.map((c) => c.programName))

    world.emailCampaigns
      .filter((c) => c.filter.kind === 'program')
      .forEach((c) => {
        const value = c.filter.value
        expect(value).toBeDefined()
        if (value) expect(programs.has(value)).toBe(true)
      })

    expect(world.emailCampaigns.some((c) => c.filter.value === 'Culinary')).toBe(false)
  })
})

describe('seedDemo — Certificates mirror the pending → approved story (#69)', () => {
  it('earns one Certificate per passing Grade, each backed by a real passing Grade', () => {
    const world = seedDemo(EPOCH)
    const passingGrades = world.grades.filter((g) => g.score >= 70)
    expect(world.certificates.length).toBe(passingGrades.length)

    const gradeByPair = new Map(passingGrades.map((g) => [`${g.studentId}:${g.courseId}`, g]))
    world.certificates.forEach((cert) => {
      const grade = gradeByPair.get(`${cert.studentId}:${cert.courseId}`)
      expect(grade).toBeDefined()
      expect(cert.score).toBe(grade?.score)
    })
  })

  it('leaves a small batch pending (admin has approvals waiting) and approves the rest', () => {
    const world = seedDemo(EPOCH)
    const pending = world.certificates.filter((c) => c.status === 'pending')
    const approved = world.certificates.filter((c) => c.status === 'approved')

    expect(pending.length).toBeGreaterThanOrEqual(2)
    expect(pending.length).toBeLessThanOrEqual(3)
    expect(approved.length).toBeGreaterThan(0)
  })

  it('stamps approval metadata only on approved Certificates', () => {
    const world = seedDemo(EPOCH)
    world.certificates.forEach((cert) => {
      if (cert.status === 'approved') {
        expect(cert.approvedAt).toBeTruthy()
        expect(cert.approvedBy).toBe('admin')
      } else {
        expect(cert.approvedAt).toBeUndefined()
        expect(cert.approvedBy).toBeUndefined()
      }
    })
  })
})

describe('seedDemo — TCU trainees and activities', () => {
  it('creates trainees with the seeded TCU persona', () => {
    const world = seedDemo(EPOCH)
    expect(world.tcuTrainees.length).toBeGreaterThan(0)
    expect(world.tcuTrainees.some((t) => t.id === 'tcu-1')).toBe(true)
  })

  it('TCU activities belong to real trainees and are dated in the past', () => {
    const world = seedDemo(EPOCH)
    expect(world.tcuActivities.length).toBeGreaterThan(0)

    const traineeIds = new Set(world.tcuTrainees.map((t) => t.id))
    world.tcuActivities.forEach((activity) => {
      expect(traineeIds.has(activity.traineeId)).toBe(true)
      expect(isBefore(new Date(activity.date), EPOCH)).toBe(true)
    })
  })

  it('seeds trainees with realistic partial progress toward 300 hours', () => {
    const world = seedDemo(EPOCH)

    // Check that the TCU persona has some activities
    const tcuPersonaActivities = world.tcuActivities.filter((a) => a.traineeId === 'tcu-1')
    expect(tcuPersonaActivities.length).toBeGreaterThan(0)

    // Calculate total hours for TCU persona
    const totalHours = tcuPersonaActivities.reduce((sum, a) => sum + a.hours, 0)
    expect(totalHours).toBeGreaterThan(40) // Should have meaningful progress
    expect(totalHours).toBeLessThan(300) // But not complete
  })
})

describe('seedDemo — one Sede binds Course, Teacher, Student (ADR-0011)', () => {
  it('gives every Course the Sede of its Teacher', () => {
    const world = seedDemo(EPOCH)
    const teacherById = new Map(world.teachers.map((t) => [t.id, t]))

    world.courses.forEach((course) => {
      const teacher = teacherById.get(course.teacherId)
      expect(teacher).toBeDefined()
      expect(course.sede).toBe(teacher?.sede)
    })
  })

  it('enrolls students only in Courses at their own Sede', () => {
    const world = seedDemo(EPOCH)
    const studentById = new Map(world.students.map((s) => [s.id, s]))
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    expect(world.enrollments.length).toBeGreaterThan(0)
    world.enrollments.forEach((enrollment) => {
      const student = studentById.get(enrollment.studentId)
      const course = courseById.get(enrollment.courseId)
      expect(student).toBeDefined()
      expect(course).toBeDefined()
      expect(student?.sede).toBe(course?.sede)
    })
  })

  it('aligns the student persona with the teacher persona Sede (stu-1 shares tea-1)', () => {
    const world = seedDemo(EPOCH)
    const stu1 = world.students.find((s) => s.id === 'stu-1')
    const tea1 = world.teachers.find((t) => t.id === 'tea-1')
    expect(stu1?.sede).toBe(tea1?.sede)
  })

  it('assigns every Teacher and Student a known Sede', () => {
    const world = seedDemo(EPOCH)
    const sedes = new Set<string>(SEDES)
    world.teachers.forEach((t) => expect(sedes.has(t.sede)).toBe(true))
    world.students.forEach((s) => expect(sedes.has(s.sede)).toBe(true))
  })

  it('never assigns a Student the University level (secondary only)', () => {
    const world = seedDemo(EPOCH)
    world.students.forEach((s) => expect(s.educationalLevel).not.toBe('University'))
  })
})

describe('seedDemo — vocabulary is sourced from the shared constants', () => {
  it('draws every Course program from @/constants/course and sede from @/constants/sede', () => {
    const world = seedDemo(EPOCH)
    const programs = new Set<string>(PROGRAMS)
    const sedes = new Set<string>(SEDES)

    world.courses.forEach((course) => {
      expect(programs.has(course.programName)).toBe(true)
      expect(sedes.has(course.sede)).toBe(true)
    })
  })

  it('draws every student province and educational level from @/constants/student', () => {
    const world = seedDemo(EPOCH)
    const provinces = new Set<string>(PROVINCES)
    const levels = new Set<string>(EDUCATIONAL_LEVELS)

    world.students.forEach((student) => {
      expect(provinces.has(student.province)).toBe(true)
      expect(levels.has(student.educationalLevel)).toBe(true)
    })
  })
})

describe('seedDemo — recent joiners create a real growth trend', () => {
  it('seeds students within the trailing window so the student trend reads positive', () => {
    const world = seedDemo(EPOCH)
    const delta = dashboardStatDeltas(
      {
        students: world.students,
        enrollments: world.enrollments,
        certificates: world.certificates,
        tcuActivities: world.tcuActivities,
      },
      EPOCH
    ).totalStudents

    expect(delta).not.toBeNull()
    expect(delta as number).toBeGreaterThan(0)
  })

  it('places at least one student inside the trailing window', () => {
    const world = seedDemo(EPOCH)
    const windowStart = subDays(EPOCH, TRAILING_WINDOW_DAYS)
    const recent = world.students.filter((s) => new Date(s.createdAt) >= windowStart)
    expect(recent.length).toBeGreaterThan(0)
  })
})
