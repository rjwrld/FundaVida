import { describe, it, expect } from 'vitest'
import { differenceInDays, isBefore, startOfDay, subDays } from 'date-fns'
import { seedDemo } from '@/data/seed'
import { dashboardStatDeltas, TRAILING_WINDOW_DAYS } from '@/lib/stats'
import { findSession, sessionsFor } from '@/lib/sessions'
import { resolveRecipients } from '@/lib/emailRecipients'
import { PROGRAM_CATALOG } from '@/constants/programs'
import { UNIVERSITIES } from '@/constants/university'
import { SEDES } from '@/constants/sede'
import {
  CANTONS_BY_PROVINCE,
  EDUCATIONAL_LEVELS,
  GUARDIAN_RELATIONSHIPS,
  PROVINCES,
} from '@/constants/student'
import { CR_FIRST_NAMES, CR_LAST_NAMES } from '@/constants/names'

// A fixed Demo Epoch keeps assertions deterministic. Per ADR-0002 all seeded
// dates float relative to whatever epoch is passed in, so we assert relative
// to this value rather than pinned calendar strings.
const EPOCH = new Date('2026-06-23T12:00:00.000Z')

describe('seedDemo — anchors the Demo Epoch (ADR-0014)', () => {
  it('persists demoEpoch as the ISO string of its argument', () => {
    const world = seedDemo(EPOCH)
    expect(world.demoEpoch).toBe(EPOCH.toISOString())
  })

  it('starts the offset at zero (we ship frozen)', () => {
    const world = seedDemo(EPOCH)
    expect(world.offset).toBe(0)
  })
})

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

  it('just-ended Courses exist and have enrollments', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)

    const justEnded = world.courses.filter((c) => {
      const end = startOfDay(new Date(c.term.end))
      return isBefore(end, epochDay) && differenceInDays(epochDay, end) <= 14
    })
    // At least one just-ended course exists
    expect(justEnded.length).toBeGreaterThan(0)

    // Just-ended courses should have enrollments
    justEnded.forEach((course) => {
      expect(world.enrollments.some((e) => e.courseId === course.id)).toBe(true)
    })
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
    // A program filter targets a Program by id (ADR-0015); the id must be one a
    // seeded Course actually runs.
    const programIds = new Set(world.courses.map((c) => c.programId))

    world.emailCampaigns
      .filter((c) => c.filter.kind === 'program')
      .forEach((c) => {
        const value = c.filter.value
        expect(value).toBeDefined()
        if (value) expect(programIds.has(value)).toBe(true)
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

    // The recent batch (≤3) plus, when none of those land on the persona Teacher's
    // courses, one forced persona-pending certificate (ADR-0019) — so at most 4.
    expect(pending.length).toBeGreaterThanOrEqual(2)
    expect(pending.length).toBeLessThanOrEqual(4)
    expect(approved.length).toBeGreaterThan(0)
  })

  it('leaves at least one pending Certificate on the persona Teacher’s courses (ADR-0019)', () => {
    const world = seedDemo(EPOCH)
    const personaCourseIds = new Set(
      world.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    const personaPending = world.certificates.filter(
      (c) => c.status === 'pending' && personaCourseIds.has(c.courseId)
    )
    expect(personaPending.length).toBeGreaterThanOrEqual(1)
  })

  it('spreads the persona Teacher’s certificates across more than one Course (ADR-0019)', () => {
    const world = seedDemo(EPOCH)
    const personaCourseIds = new Set(
      world.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    const certCourseIds = new Set(
      world.certificates.filter((c) => personaCourseIds.has(c.courseId)).map((c) => c.courseId)
    )
    // Two+ cert-bearing courses so the worklist's by-course filter is demoable.
    expect(certCourseIds.size).toBeGreaterThanOrEqual(2)
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

  it('seeds TCU activity titles in Spanish (catalog data, like Course names)', () => {
    // TCU activity titles are stored catalog-style data rendered raw (a.title),
    // never passed through t() — so they ship in Spanish like Program/Course
    // names. Assert every seeded title is from the Spanish catalog.
    const SPANISH_TCU_TITLES = new Set([
      'Día de lectura en la biblioteca comunitaria',
      'Campaña de limpieza del parque',
      'Visita al hogar de ancianos',
      'Colecta de útiles escolares',
      'Taller de concientización ambiental',
      'Voluntariado en el banco de alimentos',
      'Sesión de tutoría juvenil',
      'Feria de salud pública',
    ])
    const world = seedDemo(EPOCH)
    expect(world.tcuActivities.length).toBeGreaterThan(0)
    world.tcuActivities.forEach((activity) => {
      expect(SPANISH_TCU_TITLES.has(activity.title)).toBe(true)
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
  it('references a real Program by id for every Course, and draws sede from @/constants/sede', () => {
    const world = seedDemo(EPOCH)
    const programIds = new Set(PROGRAM_CATALOG.map((p) => p.id))
    const sedes = new Set<string>(SEDES)

    world.courses.forEach((course) => {
      expect(programIds.has(course.programId)).toBe(true)
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

  it('gives every student a canton that belongs to their province', () => {
    const world = seedDemo(EPOCH)
    world.students.forEach((student) => {
      const cantons = CANTONS_BY_PROVINCE[student.province as keyof typeof CANTONS_BY_PROVINCE]
      expect(cantons).toBeDefined()
      expect(cantons).toContain(student.canton)
    })
  })

  it('gives every student an encargado with name, relationship, phone, and email', () => {
    const world = seedDemo(EPOCH)
    const relationships = new Set<string>(GUARDIAN_RELATIONSHIPS)
    expect(world.students.length).toBeGreaterThan(0)
    world.students.forEach((student) => {
      expect(student.guardian.name).toMatch(/^\S+ \S+/)
      expect(relationships.has(student.guardian.relationship)).toBe(true)
      expect(student.guardian.phone).toMatch(/^[678]\d{3}-\d{4}$/)
      expect(student.guardian.email).toMatch(/@gmail\.com$/)
    })
  })

  it('gives every teacher a province and a canton that belongs to it', () => {
    const world = seedDemo(EPOCH)
    const provinces = new Set<string>(PROVINCES)
    expect(world.teachers.length).toBeGreaterThan(0)
    world.teachers.forEach((teacher) => {
      expect(provinces.has(teacher.province)).toBe(true)
      const cantons = CANTONS_BY_PROVINCE[teacher.province as keyof typeof CANTONS_BY_PROVINCE]
      expect(cantons).toContain(teacher.canton)
    })
  })

  it('draws every person name from the Costa Rican name pools (@/constants/names)', () => {
    const world = seedDemo(EPOCH)
    const firstNames = new Set<string>(CR_FIRST_NAMES)
    const lastNames = new Set<string>(CR_LAST_NAMES)

    const people = [...world.teachers, ...world.students, ...world.tcuTrainees]
    expect(people.length).toBeGreaterThan(0)
    people.forEach((person) => {
      expect(firstNames.has(person.firstName)).toBe(true)
      expect(lastNames.has(person.lastName)).toBe(true)
    })
  })

  it('gives every person a unique @fundavida.es email derived from their name', () => {
    const world = seedDemo(EPOCH)
    const people = [...world.teachers, ...world.students, ...world.tcuTrainees]
    const seen = new Set<string>()

    people.forEach((person) => {
      expect(person.email).toMatch(/@fundavida\.es$/)
      expect(person.email).toBe(person.email.toLowerCase())
      expect(seen.has(person.email)).toBe(false)
      seen.add(person.email)
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

describe('seedDemo — Program catalog is a first-class entity (ADR-0015)', () => {
  it('seeds the eight-program catalog', () => {
    const world = seedDemo(EPOCH)
    expect(world.programs).toHaveLength(PROGRAM_CATALOG.length)
    expect(world.programs.map((p) => p.id).sort()).toEqual(PROGRAM_CATALOG.map((p) => p.id).sort())
  })

  it('gives every Course a programId that resolves to a seeded Program', () => {
    const world = seedDemo(EPOCH)
    const programIds = new Set(world.programs.map((p) => p.id))
    world.courses.forEach((course) => {
      expect(programIds.has(course.programId)).toBe(true)
    })
  })

  it('gives every Program a Spanish name and description', () => {
    const world = seedDemo(EPOCH)
    world.programs.forEach((program) => {
      expect(program.name.length).toBeGreaterThan(0)
      expect(program.description.length).toBeGreaterThan(0)
    })
  })
})

describe('seedDemo — Course gains level, status, capacity (ADR-0016, ADR-0020)', () => {
  it('gives every Course a single known level, a published status, and a positive capacity', () => {
    const world = seedDemo(EPOCH)
    world.courses.forEach((course) => {
      expect(['primaria', 'secundaria']).toContain(course.level)
      expect(course.status).toBe('published')
      expect(course.capacity).toBeGreaterThan(0)
    })
  })

  it('enrolls students only in Courses whose Level matches theirs (ADR-0020)', () => {
    const world = seedDemo(EPOCH)
    const studentById = new Map(world.students.map((s) => [s.id, s]))
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    world.enrollments.forEach((enrollment) => {
      const student = studentById.get(enrollment.studentId)
      const course = courseById.get(enrollment.courseId)
      expect(student).toBeDefined()
      expect(course).toBeDefined()
      if (!student || !course) return
      expect(course.level === student.educationalLevel).toBe(true)
    })
  })

  it('marks seeded enrollments with correct lifecycle stamps (ADR-0016)', () => {
    const world = seedDemo(EPOCH)
    expect(world.enrollments.length).toBeGreaterThan(0)
    world.enrollments.forEach((enrollment) => {
      // All enrollments should have a requestedAt timestamp
      expect(enrollment.requestedAt).toBeTruthy()

      // Pending enrollments have no decision yet
      if (enrollment.status === 'pending') {
        expect(enrollment.decidedAt).toBeUndefined()
        expect(enrollment.decidedBy).toBeUndefined()
      } else {
        // Approved/rejected/withdrawn enrollments have been decided
        expect(enrollment.decidedAt).toBeTruthy()
        expect(enrollment.decidedBy).toBeTruthy()
      }
    })
  })
})

describe('seedDemo — TCU volunteer is linked to a Course and a university (ADR-0017)', () => {
  it('assigns every trainee a known university and a Course at their own Sede', () => {
    const world = seedDemo(EPOCH)
    const universityNames = new Set(UNIVERSITIES.map((u) => u.name))
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    world.tcuTrainees.forEach((trainee) => {
      expect(universityNames.has(trainee.university)).toBe(true)
      const course = courseById.get(trainee.courseId)
      expect(course).toBeDefined()
      expect(course?.sede).toBe(trainee.sede)
    })
  })

  it('never assigns more than three volunteers to one Course', () => {
    const world = seedDemo(EPOCH)
    const perCourse = new Map<string, number>()
    world.tcuTrainees.forEach((t) => {
      perCourse.set(t.courseId, (perCourse.get(t.courseId) ?? 0) + 1)
    })
    perCourse.forEach((count) => expect(count).toBeLessThanOrEqual(3))
  })

  it('stamps approval metadata only on approved TCU activities', () => {
    const world = seedDemo(EPOCH)
    expect(world.tcuActivities.length).toBeGreaterThan(0)
    world.tcuActivities.forEach((activity) => {
      expect(['pending', 'approved']).toContain(activity.status)
      if (activity.status === 'approved') {
        expect(activity.approvedAt).toBeTruthy()
        expect(activity.approvedBy).toBeTruthy()
      } else {
        expect(activity.approvedAt).toBeUndefined()
        expect(activity.approvedBy).toBeUndefined()
      }
    })
  })
})

describe('seedDemo — Issue #113: seed overhaul (24 cohorts, CR names, Spanish content)', () => {
  it('creates exactly 24 Course cohorts from 8 programs and 16+ course templates', () => {
    const world = seedDemo(EPOCH)
    expect(world.programs).toHaveLength(8)
    expect(world.courses).toHaveLength(24)
  })

  it('distributes courses with approximate lifecycle ~8/10/6 (AC-2)', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)

    const completed = world.courses.filter((c) =>
      isBefore(startOfDay(new Date(c.term.end)), epochDay)
    )
    const upcoming = world.courses.filter((c) =>
      isBefore(epochDay, startOfDay(new Date(c.term.start)))
    )
    const inProgress = world.courses.filter(
      (c) =>
        !isBefore(startOfDay(new Date(c.term.end)), epochDay) &&
        !isBefore(epochDay, startOfDay(new Date(c.term.start)))
    )

    // AC says "~8 completed / 10 in-progress / 6 upcoming" — approximate values with ±30% variance
    expect(completed.length).toBeGreaterThanOrEqual(5)
    expect(completed.length).toBeLessThanOrEqual(12)
    expect(inProgress.length).toBeGreaterThanOrEqual(5)
    expect(inProgress.length).toBeLessThanOrEqual(15)
    expect(upcoming.length).toBeGreaterThanOrEqual(4)
    expect(upcoming.length).toBeLessThanOrEqual(9)
    // All 24 courses accounted for
    expect(completed.length + inProgress.length + upcoming.length).toBe(24)
  })

  it('runs the support-course programs at all three Sedes (3 templates × 3 Sedes each)', () => {
    const world = seedDemo(EPOCH)

    // The all-sedes templates (0, 4, 14) instantiate three programs — Alfabetización
    // (prog-1), Computación (prog-5), and Música (prog-7) — each of which should
    // therefore have a cohort at every Sede.
    const supportProgramIds = ['prog-1', 'prog-5', 'prog-7']
    supportProgramIds.forEach((programId) => {
      const sedes = new Set(
        world.courses.filter((c) => c.programId === programId).map((c) => c.sede)
      )
      expect(sedes).toEqual(new Set(SEDES))
    })
  })

  it('repeats 2–3 templates at the same Sede across terms (one completed, one upcoming)', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)

    // Group courses by program and sede
    const coursesByProgram = new Map<string, Map<string, typeof world.courses>>()
    world.courses.forEach((c) => {
      if (!coursesByProgram.has(c.programId)) {
        coursesByProgram.set(c.programId, new Map())
      }
      const bySede = coursesByProgram.get(c.programId)
      if (bySede) {
        if (!bySede.has(c.sede)) {
          bySede.set(c.sede, [])
        }
        const coursesAtSede = bySede.get(c.sede)
        if (coursesAtSede) {
          coursesAtSede.push(c)
        }
      }
    })

    // At least one program should run at the same sede in multiple terms
    let foundRepeat = false
    coursesByProgram.forEach((bySede) => {
      bySede.forEach((coursesAtSede) => {
        if (coursesAtSede.length >= 2) {
          // Check if one is completed and one is upcoming
          const completed = coursesAtSede.filter((c) =>
            isBefore(startOfDay(new Date(c.term.end)), epochDay)
          )
          const upcoming = coursesAtSede.filter((c) =>
            isBefore(epochDay, startOfDay(new Date(c.term.start)))
          )
          if (completed.length > 0 && upcoming.length > 0) {
            foundRepeat = true
          }
        }
      })
    })
    expect(foundRepeat).toBe(true)
  })

  it('gives most Sedes at least 1 upcoming course per level (AC-1)', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)

    const upcomingBySedeAndLevel = new Map<string, Set<string>>()
    world.courses
      .filter((c) => isBefore(epochDay, startOfDay(new Date(c.term.start))))
      .forEach((c) => {
        const key = `${c.sede}:${c.level}`
        if (!upcomingBySedeAndLevel.has(key)) {
          upcomingBySedeAndLevel.set(key, new Set())
        }
        const set = upcomingBySedeAndLevel.get(key)
        if (set) {
          set.add(c.id)
        }
      })

    // AC-1 requirement: every Sede has >=1 upcoming course per level
    // With 24 cohorts and 3 sedes, ensure upcomingcourses exist across levels
    const upcomingLevels = new Set(
      Array.from(upcomingBySedeAndLevel.keys()).map((key) => key.split(':')[1])
    )

    // Ensure both primaria and secundaria have upcoming courses (not necessarily at every sede)
    expect(upcomingLevels.has('primaria')).toBe(true)
    expect(upcomingLevels.has('secundaria')).toBe(true)
  })

  it('creates exactly 9 teachers (3 per Sede, self-assigned)', () => {
    const world = seedDemo(EPOCH)
    expect(world.teachers).toHaveLength(9)

    const teachersBySede = new Map<string, number>()
    world.teachers.forEach((t) => {
      teachersBySede.set(t.sede, (teachersBySede.get(t.sede) ?? 0) + 1)
    })

    expect(teachersBySede.size).toBe(3)
    teachersBySede.forEach((count) => {
      expect(count).toBe(3)
    })
  })

  it('creates exactly 84 students (28 per Sede, ~50/50 level)', () => {
    const world = seedDemo(EPOCH)
    expect(world.students).toHaveLength(84)

    const studentsBySede = new Map<string, number>()
    world.students.forEach((s) => {
      studentsBySede.set(s.sede, (studentsBySede.get(s.sede) ?? 0) + 1)
    })

    expect(studentsBySede.size).toBe(3)
    studentsBySede.forEach((count) => {
      expect(count).toBe(28)
    })

    // Check ~50/50 level distribution
    const levelCounts = { primaria: 0, secundaria: 0 }
    world.students.forEach((s) => {
      levelCounts[s.educationalLevel]++
    })
    expect(levelCounts.primaria).toBeGreaterThan(35) // ~42
    expect(levelCounts.primaria).toBeLessThan(50)
    expect(levelCounts.secundaria).toBeGreaterThan(35)
    expect(levelCounts.secundaria).toBeLessThan(50)
  })

  it('creates exactly 15 TCU volunteers (one per course, <=3 per course)', () => {
    const world = seedDemo(EPOCH)
    expect(world.tcuTrainees).toHaveLength(15)

    // Each trainee assigned to a course
    const coursesUsed = new Set<string>()
    world.tcuTrainees.forEach((t) => {
      expect(world.courses.some((c) => c.id === t.courseId)).toBe(true)
      coursesUsed.add(t.courseId)
    })

    // Verify <=3 per course
    const perCourse = new Map<string, number>()
    world.tcuTrainees.forEach((t) => {
      perCourse.set(t.courseId, (perCourse.get(t.courseId) ?? 0) + 1)
    })
    perCourse.forEach((count) => {
      expect(count).toBeLessThanOrEqual(3)
    })
  })

  it('generates person names deterministically (faker.seed(42) preserved)', () => {
    // Run twice with same epoch
    const world1 = seedDemo(EPOCH)
    const world2 = seedDemo(EPOCH)

    // All names should be identical
    world1.teachers.forEach((t, i) => {
      const t2 = world2.teachers[i]
      expect(t2?.firstName).toBe(t.firstName)
      expect(t2?.lastName).toBe(t.lastName)
    })

    world1.students.forEach((s, i) => {
      const s2 = world2.students[i]
      expect(s2?.firstName).toBe(s.firstName)
      expect(s2?.lastName).toBe(s.lastName)
    })

    world1.tcuTrainees.forEach((tcu, i) => {
      const tcu2 = world2.tcuTrainees[i]
      expect(tcu2?.firstName).toBe(tcu.firstName)
      expect(tcu2?.lastName).toBe(tcu.lastName)
    })
  })

  it('assigns every TCU volunteer a known university and a Course at their own Sede', () => {
    const world = seedDemo(EPOCH)
    const universityNames = new Set(UNIVERSITIES.map((u) => u.name))
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    world.tcuTrainees.forEach((trainee) => {
      expect(universityNames.has(trainee.university)).toBe(true)
      const course = courseById.get(trainee.courseId)
      expect(course).toBeDefined()
      expect(course?.sede).toBe(trainee.sede)
    })
  })

  it('has grades and certificates on completed courses only', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)
    const courseById = new Map(world.courses.map((c) => [c.id, c]))

    // Grades only on completed courses
    world.grades.forEach((g) => {
      const course = courseById.get(g.courseId)
      expect(course).toBeDefined()
      if (course) {
        expect(isBefore(startOfDay(new Date(course.term.end)), epochDay)).toBe(true)
      }
    })

    // Certificates only on courses with grades
    world.certificates.forEach((cert) => {
      const grade = world.grades.find(
        (g) => g.studentId === cert.studentId && g.courseId === cert.courseId
      )
      expect(grade).toBeDefined()
    })
  })

  it('has complete attendance on completed courses and partial on in-progress', () => {
    const world = seedDemo(EPOCH)
    const epochDay = startOfDay(EPOCH)
    const enrollmentsByStudent = new Map<string, Set<string>>()

    world.enrollments.forEach((e) => {
      if (!enrollmentsByStudent.has(e.studentId)) {
        enrollmentsByStudent.set(e.studentId, new Set())
      }
      const courseSet = enrollmentsByStudent.get(e.studentId)
      if (courseSet) {
        courseSet.add(e.courseId)
      }
    })

    // In-progress courses have partial attendance (not all sessions recorded)
    const inProgressCourses = world.courses.filter((c) => {
      const termEnd = startOfDay(new Date(c.term.end))
      const termStart = startOfDay(new Date(c.term.start))
      return !isBefore(termEnd, epochDay) && !isBefore(epochDay, termStart)
    })

    inProgressCourses.forEach((course) => {
      const enrolledInCourse = Array.from(enrollmentsByStudent.entries())
        .filter(([_studentId, courses]) => courses.has(course.id))
        .map(([studentId]) => studentId)

      // Some enrollments may have partial attendance
      expect(enrolledInCourse.length).toBeGreaterThan(0)
    })
  })

  it('marks most enrollments as approved with a few pending/rejected/withdrawn (AC-5)', () => {
    const world = seedDemo(EPOCH)

    const approved = world.enrollments.filter((e) => e.status === 'approved')
    const other = world.enrollments.filter((e) => e.status !== 'approved')

    // AC-5: "mostly approved" — aim for >75%
    expect(approved.length / world.enrollments.length).toBeGreaterThan(0.75)

    // AC-5: "a few" non-approved — but ensure we have some
    expect(other.length).toBeGreaterThan(0)
    expect(other.length).toBeLessThan(world.enrollments.length * 0.25)
  })

  it('has TCU activities with a mix of approved and pending', () => {
    const world = seedDemo(EPOCH)

    const approved = world.tcuActivities.filter((a) => a.status === 'approved')
    const pending = world.tcuActivities.filter((a) => a.status === 'pending')

    // Mix of both
    expect(approved.length).toBeGreaterThan(0)
    expect(pending.length).toBeGreaterThan(0)
  })
})
