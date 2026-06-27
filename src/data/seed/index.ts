import { faker } from '@faker-js/faker'
import { addDays, addWeeks, startOfDay, subDays, subWeeks } from 'date-fns'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  Certificate,
  TcuActivity,
  TcuTrainee,
  AttendanceRecord,
  AttendanceStatus,
  AuditLogEntry,
  EmailCampaign,
  Weekday,
} from '@/types'
import { sessionsFor } from '@/lib/sessions'
import { PASSING_SCORE } from '@/lib/certificates'
import { resolveRecipients } from '@/lib/emailRecipients'
import { PROGRAMS } from '@/constants/course'
import { SEDES, type Sede } from '@/constants/sede'
import { EDUCATIONAL_LEVELS, GENDERS, PROVINCES } from '@/constants/student'

export interface SeedSnapshot {
  // The explicit Demo Epoch (ADR-0014): the frozen instant the clock reads as
  // "now". Persisted so a returning visitor's filters and write timestamps read
  // the same frozen epoch the seeded dates were anchored to. `offset` shifts the
  // clock for a later date-travel feature; we ship frozen, so it starts at 0.
  demoEpoch: string
  offset: number
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  certificates: Certificate[]
  tcuTrainees: TcuTrainee[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
  auditLog: AuditLogEntry[]
  emailCampaigns: EmailCampaign[]
}

// The seeded teacher persona (the current user behind the 'teacher' role) owns
// the just-ended, ungraded Course — the golden-path runway for the
// teacher-grades → admin-approves → student-downloads story.
const TEACHER_PERSONA_INDEX = 0 // tea-1

// A few students join within the dashboard's trailing window so the headline
// "vs last month" trend reflects real recent growth instead of a frozen 0%.
// Recent joiners enrol only in not-yet-started cohorts (see buildEnrollments),
// so they never carry attendance or grades dated before they existed.
const RECENT_JOINER_COUNT = 4
const RECENT_JOINER_MAX_AGE_DAYS = 24

const MEETING_DAY_PATTERNS: Weekday[][] = [
  ['mon', 'wed'],
  ['tue', 'thu'],
  ['mon', 'wed', 'fri'],
  ['tue', 'thu'],
  ['mon', 'wed'],
  ['tue', 'thu', 'fri'],
  ['mon', 'wed'],
  ['tue', 'thu'],
]

const TCU_ACTIVITY_TITLES = [
  'Community library reading day',
  'Park cleanup campaign',
  'Elderly home visit',
  'School supply drive',
  'Environmental awareness workshop',
  'Food bank volunteering',
  'Youth tutoring session',
  'Public health awareness fair',
]

// The seeded TCU persona (the current user behind the 'tcu' role) organizes a
// share of the logged service activities.
const TCU_PERSONA_ID = 'tcu-1'

type CourseRole = 'completed' | 'just-ended' | 'in-progress' | 'upcoming'

interface CoursePlan {
  role: CourseRole
  teacherIndex: number
  termStart: Date
  termEnd: Date
}

/**
 * The fixed cast of Courses, positioned relative to the Demo Epoch (ADR-0002):
 * two completed, one just-ended (owned by the teacher persona and left
 * ungraded), four in-progress, one upcoming. Anchored at local midnight so the
 * derived Session list aligns with the scheduling contract (ADR-0004).
 */
function planCourses(epoch: Date): CoursePlan[] {
  const day = startOfDay(epoch)
  return [
    {
      role: 'completed',
      teacherIndex: 0,
      termStart: subWeeks(day, 24),
      termEnd: subWeeks(day, 16),
    },
    {
      role: 'completed',
      teacherIndex: 1,
      termStart: subWeeks(day, 20),
      termEnd: subWeeks(day, 12),
    },
    { role: 'just-ended', teacherIndex: 0, termStart: subWeeks(day, 14), termEnd: subDays(day, 8) },
    {
      role: 'in-progress',
      teacherIndex: 2,
      termStart: subWeeks(day, 3),
      termEnd: addWeeks(day, 9),
    },
    {
      role: 'in-progress',
      teacherIndex: 3,
      termStart: subWeeks(day, 5),
      termEnd: addWeeks(day, 7),
    },
    {
      role: 'in-progress',
      teacherIndex: 4,
      termStart: subWeeks(day, 7),
      termEnd: addWeeks(day, 5),
    },
    {
      role: 'in-progress',
      teacherIndex: 5,
      termStart: subWeeks(day, 2),
      termEnd: addWeeks(day, 10),
    },
    { role: 'upcoming', teacherIndex: 1, termStart: addDays(day, 10), termEnd: addWeeks(day, 14) },
  ]
}

function buildTeachers(epoch: Date, count: number): Teacher[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `tea-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    // Cycle the three Sedes so each community center has at least one Teacher
    // (and therefore at least one Course) for the demo story.
    sede: SEDES[i % SEDES.length] as Sede,
    courseIds: [],
    // Teachers predate every Course they could teach.
    createdAt: subDays(epoch, 420 + faker.number.int({ min: 0, max: 180 })).toISOString(),
  }))
}

function buildCourses(epoch: Date, plans: CoursePlan[], teachers: Teacher[]): Course[] {
  const sedeByTeacherId = new Map(teachers.map((t) => [t.id, t.sede]))
  return plans.map((plan, i) => {
    const termStart = startOfDay(plan.termStart)
    const termEnd = startOfDay(plan.termEnd)
    // A Course is created shortly before its Term begins, but never in the future.
    const created = subDays(termStart, faker.number.int({ min: 7, max: 30 }))
    const createdAt = (created > epoch ? subDays(startOfDay(epoch), 1) : created).toISOString()
    const teacherId = `tea-${plan.teacherIndex + 1}`
    return {
      id: `cou-${i + 1}`,
      name: `${PROGRAMS[i % PROGRAMS.length]} ${i + 1}`,
      description: faker.lorem.sentence(),
      // A Course is taught at its Teacher's Sede (ADR-0011) — never assigned
      // independently, so the Course↔Teacher Sede invariant holds by construction.
      sede: sedeByTeacherId.get(teacherId) as Sede,
      programName: PROGRAMS[i % PROGRAMS.length] as string,
      teacherId,
      term: { start: termStart.toISOString(), end: termEnd.toISOString() },
      meetingDays: MEETING_DAY_PATTERNS[i] as Weekday[],
      createdAt,
    }
  })
}

function buildStudents(
  epoch: Date,
  count: number,
  earliestTermStart: Date,
  personaSede: Sede
): Student[] {
  const recentFromIndex = count - RECENT_JOINER_COUNT
  return Array.from({ length: count }, (_, i) => ({
    id: `stu-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    gender: faker.helpers.arrayElement(GENDERS),
    // stu-1 deliberately shares the teacher persona's Sede so it can enrol in the
    // persona's Courses (the golden-path runway); the rest cycle the three Sedes,
    // each of which has Courses to enrol in.
    sede: i === 0 ? personaSede : (SEDES[i % SEDES.length] as Sede),
    province: faker.helpers.arrayElement(PROVINCES),
    canton: faker.location.city(),
    educationalLevel: faker.helpers.arrayElement(EDUCATIONAL_LEVELS),
    enrolledCourseIds: [],
    // Most students predate the earliest Term; the last few are recent joiners
    // (created within the trailing window) so the dashboard shows real growth.
    createdAt: (i >= recentFromIndex
      ? subDays(epoch, faker.number.int({ min: 2, max: RECENT_JOINER_MAX_AGE_DAYS }))
      : subDays(earliestTermStart, 21 + faker.number.int({ min: 0, max: 200 }))
    ).toISOString(),
  }))
}

/**
 * Enrollments are placed near each Course's Term start (you sign up shortly
 * before a cohort begins), always on or after the student's creation and never
 * in the future. The teacher persona's student (stu-1) is deliberately enrolled
 * in the persona's completed Course (so they have a Grade) and the just-ended
 * one (the golden-path runway).
 */
function buildEnrollments(epoch: Date, students: Student[], courses: Course[]): Enrollment[] {
  const epochDay = startOfDay(epoch)
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const personaCourses = courses
    .filter((c) => c.teacherId === `tea-${TEACHER_PERSONA_INDEX + 1}`)
    .map((c) => c.id)

  const enrollments: Enrollment[] = []
  let counter = 0

  students.forEach((student, si) => {
    // A Student may only enrol in Courses at their own Sede (ADR-0011). The
    // persona (stu-1) shares tea-1's Sede, so the persona's Courses qualify.
    const sameSedeCourseIds = courses.filter((c) => c.sede === student.sede).map((c) => c.id)
    const isRecentJoiner = si >= students.length - RECENT_JOINER_COUNT
    let courseIds: string[]
    if (si === 0) {
      courseIds = personaCourses
    } else if (isRecentJoiner) {
      // Recent joiners only sign up for cohorts that have not started yet, so
      // they never accrue attendance or grades dated before they existed.
      courseIds = courses
        .filter(
          (c) =>
            c.sede === student.sede &&
            startOfDay(new Date(c.term.start)).getTime() > epochDay.getTime()
        )
        .map((c) => c.id)
    } else {
      courseIds = faker.helpers.arrayElements(
        sameSedeCourseIds,
        faker.number.int({ min: 1, max: Math.min(3, sameSedeCourseIds.length) })
      )
    }

    courseIds.forEach((courseId) => {
      const course = courseById.get(courseId)
      if (!course) return
      const termStart = startOfDay(new Date(course.term.start))
      const created = new Date(student.createdAt)
      let enrolledAt = subDays(termStart, faker.number.int({ min: 0, max: 14 }))
      if (enrolledAt < created) enrolledAt = created
      if (enrolledAt > epochDay) enrolledAt = epochDay
      enrollments.push({
        id: `enr-${(counter += 1)}`,
        studentId: student.id,
        courseId,
        enrolledAt: enrolledAt.toISOString(),
      })
    })
  })

  return enrollments
}

function pickAttendanceStatus(): AttendanceStatus {
  const roll = faker.number.float({ min: 0, max: 1 })
  if (roll < 0.75) return 'present'
  if (roll < 0.9) return 'absent'
  return 'excused'
}

/**
 * Attendance is recorded per derived Session (ADR-0001): for every enrollment,
 * the most recent past Sessions of its Course. Records bind to real Sessions by
 * construction, so an attendance date can never land where no class met.
 */
function buildAttendance(
  epoch: Date,
  enrollments: Enrollment[],
  courses: Course[]
): AttendanceRecord[] {
  const epochDay = startOfDay(epoch)
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const records: AttendanceRecord[] = []
  let counter = 0

  enrollments.forEach((enrollment) => {
    const course = courseById.get(enrollment.courseId)
    if (!course) return
    const pastSessions = sessionsFor(course).filter(
      (s) => startOfDay(new Date(s.date)).getTime() < epochDay.getTime()
    )
    pastSessions.slice(-10).forEach((session) => {
      records.push({
        id: `att-${(counter += 1)}`,
        courseId: enrollment.courseId,
        studentId: enrollment.studentId,
        sessionDate: session.date,
        status: pickAttendanceStatus(),
      })
    })
  })

  return records
}

/**
 * A Grade is the single score a Teacher issues for one Enrollment after the
 * Term ends, so Grades exist only for ended Terms — and never for the
 * golden-path Course, which the teacher persona has yet to grade. Issued after
 * the Term ends (hence strictly after enrollment), never in the future.
 */
function buildGrades(
  epoch: Date,
  enrollments: Enrollment[],
  courses: Course[],
  goldenPathCourseId: string
): Grade[] {
  const epochDay = startOfDay(epoch)
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const grades: Grade[] = []
  let counter = 0

  enrollments.forEach((enrollment) => {
    if (enrollment.courseId === goldenPathCourseId) return
    const course = courseById.get(enrollment.courseId)
    if (!course) return
    const termEnd = startOfDay(new Date(course.term.end))
    if (termEnd.getTime() >= epochDay.getTime()) return

    let issuedAt = addDays(termEnd, faker.number.int({ min: 1, max: 14 }))
    if (issuedAt > epochDay) issuedAt = epochDay
    grades.push({
      id: `gra-${(counter += 1)}`,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      score: faker.number.int({ min: 60, max: 100 }),
      issuedAt: issuedAt.toISOString(),
    })
  })

  return grades
}

/**
 * A Certificate is created (pending) the moment a passing Grade is saved, and an
 * admin later approves it — which is what makes the PDF available (CONTEXT.md).
 * The seed mirrors that story: every passing Grade earns a Certificate, the older
 * cohorts' Certificates are already approved, and the three most recently graded
 * sit pending so an admin has approvals waiting on first load (issue #69).
 */
function buildCertificates(epoch: Date, grades: Grade[]): Certificate[] {
  const epochDay = startOfDay(epoch)
  const passing = grades
    .filter((g) => g.score >= PASSING_SCORE)
    .sort((a, b) => (a.issuedAt < b.issuedAt ? -1 : a.issuedAt > b.issuedAt ? 1 : 0))

  // Leave the most recently graded as pending; approve the rest.
  const pendingCount = Math.min(3, passing.length)
  const approvedCutoff = passing.length - pendingCount

  return passing.map((grade, i) => {
    const base = {
      id: `cert-${i + 1}`,
      studentId: grade.studentId,
      courseId: grade.courseId,
      score: grade.score,
      createdAt: grade.issuedAt,
    }
    if (i >= approvedCutoff) {
      return { ...base, status: 'pending' as const }
    }
    // Approved a few days after the Grade was issued, never in the future.
    let approvedAt = addDays(new Date(grade.issuedAt), faker.number.int({ min: 1, max: 7 }))
    if (approvedAt > epochDay) approvedAt = epochDay
    return {
      ...base,
      status: 'approved' as const,
      approvedAt: approvedAt.toISOString(),
      approvedBy: 'admin',
    }
  })
}

/**
 * The audit trail is emitted from the same events that built the world, so it
 * is complete by construction: one entry per create / enroll / grade, each
 * stamped with that event's own timestamp and attributed to its actor (admin
 * for administrative creates and enrollments, the issuing Teacher for Grades).
 * Newest first, matching the store's prepend ordering (ADR-0005).
 */
function buildAuditLog(input: {
  teachers: Teacher[]
  students: Student[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
}): AuditLogEntry[] {
  const { teachers, students, courses, enrollments, grades } = input
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const entries: AuditLogEntry[] = []
  let counter = 0
  const push = (entry: Omit<AuditLogEntry, 'id'>) =>
    entries.push({ id: `log-${(counter += 1)}`, ...entry })

  teachers.forEach((t) =>
    push({
      actorId: 'admin',
      action: 'create',
      entity: 'teacher',
      entityId: t.id,
      timestamp: t.createdAt,
      summary: `Created teacher ${t.firstName} ${t.lastName}`,
    })
  )
  students.forEach((s) =>
    push({
      actorId: 'admin',
      action: 'create',
      entity: 'student',
      entityId: s.id,
      timestamp: s.createdAt,
      summary: `Created student ${s.firstName} ${s.lastName}`,
    })
  )
  courses.forEach((c) =>
    push({
      actorId: 'admin',
      action: 'create',
      entity: 'course',
      entityId: c.id,
      timestamp: c.createdAt,
      summary: `Created course ${c.name}`,
    })
  )
  enrollments.forEach((e) =>
    push({
      actorId: 'admin',
      action: 'enroll',
      entity: 'enrollment',
      entityId: e.id,
      timestamp: e.enrolledAt,
      summary: `Enrolled ${e.studentId} in ${e.courseId}`,
    })
  )
  grades.forEach((g) =>
    push({
      actorId: courseById.get(g.courseId)?.teacherId ?? 'admin',
      action: 'grade',
      entity: 'grade',
      entityId: g.id,
      timestamp: g.issuedAt,
      summary: `Graded ${g.studentId} in ${g.courseId} with ${g.score}`,
    })
  )

  return entries.sort((a, b) =>
    a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0
  )
}

/**
 * Past email campaigns whose stored recipient lists are resolved through the
 * exact same logic the Bulk Email page uses, so a campaign's filter and its
 * recorded recipients can never disagree — and every program filter names a
 * Program that a seeded Course actually runs.
 */
function buildEmailCampaigns(
  epoch: Date,
  students: Student[],
  courses: Course[],
  enrollments: Enrollment[]
): EmailCampaign[] {
  const input = { students, courses, enrollments }
  const firstCourse = courses[0]
  const firstStudent = students[0]
  if (!firstCourse || !firstStudent) {
    throw new Error('buildEmailCampaigns requires at least one seeded course and student')
  }
  // A real Program with a real cohort behind it (the persona's completed Course).
  const program = firstCourse.programName
  const province = firstStudent.province

  const specs: {
    id: string
    subject: string
    body: string
    filter: EmailCampaign['filter']
    weeksAgo: number
  }[] = [
    {
      id: 'cam-1',
      subject: 'Welcome to the new term',
      body: 'Hello students — our new term begins soon. Please review the schedule and confirm your attendance.',
      filter: { kind: 'all' },
      weeksAgo: 6,
    },
    {
      id: 'cam-2',
      subject: `${program} program: upcoming session`,
      body: `${program} students — a reminder about your upcoming sessions and what to bring.`,
      filter: { kind: 'program', value: program },
      weeksAgo: 4,
    },
    {
      id: 'cam-3',
      subject: `${province}: holiday schedule`,
      body: `Students in ${province} — please review the updated holiday schedule attached to the bulletin.`,
      filter: { kind: 'province', value: province },
      weeksAgo: 2,
    },
  ]

  return specs.map((spec) => ({
    id: spec.id,
    subject: spec.subject,
    body: spec.body,
    filter: spec.filter,
    recipientIds: resolveRecipients(spec.filter, input).map((s) => s.id),
    sentAt: subWeeks(startOfDay(epoch), spec.weeksAgo).toISOString(),
    sentBy: 'admin',
  }))
}

/**
 * Build TCU Trainees: university students completing their 300-hour
 * community-service requirement at the foundation. Seeded with realistic
 * partial progress toward the goal, anchored to the Demo Epoch (ADR-0002).
 * The seeded TCU persona ('tcu-1') is always among them.
 */
function buildTcuTrainees(epoch: Date): TcuTrainee[] {
  const traineeSedes = SEDES.slice(0, 2) // Use first two sedes for variety
  const trainees: TcuTrainee[] = [
    {
      id: 'tcu-1', // The seeded TCU persona
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      sede: traineeSedes[0] as Sede,
      createdAt: subDays(epoch, faker.number.int({ min: 30, max: 180 })).toISOString(),
    },
  ]

  // Add 3-4 more trainees for admin to see
  for (let i = 0; i < 3; i += 1) {
    trainees.push({
      id: `tcu-${i + 2}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      sede: traineeSedes[i % traineeSedes.length] as Sede,
      createdAt: subDays(epoch, faker.number.int({ min: 60, max: 210 })).toISOString(),
    })
  }

  return trainees
}

/**
 * Community-service activities logged by TCU Trainees, dated within the year
 * before the epoch. Each trainee has a mix of activities with realistic
 * partial progress toward the 300-hour requirement.
 */
function buildTcuActivities(epoch: Date, trainees: TcuTrainee[]): TcuActivity[] {
  const epochDay = startOfDay(epoch)
  const activities: TcuActivity[] = []
  let counter = 0

  trainees.forEach((trainee) => {
    // TCU persona has more activities (closer to goal); others have fewer
    const isPersona = trainee.id === TCU_PERSONA_ID
    const maxActivitiesPerTrainee = isPersona ? 10 : faker.number.int({ min: 4, max: 8 })
    const targetHours = isPersona ? 220 : faker.number.int({ min: 80, max: 180 })
    let accumulatedHours = 0

    for (let i = 0; i < maxActivitiesPerTrainee && accumulatedHours < targetHours; i += 1) {
      const hoursForThisActivity = Math.min(
        faker.number.int({ min: 2, max: 8 }),
        targetHours - accumulatedHours
      )
      accumulatedHours += hoursForThisActivity

      const index = (counter += 1)
      activities.push({
        id: `tcu-act-${index}`,
        traineeId: trainee.id,
        title: faker.helpers.arrayElement(TCU_ACTIVITY_TITLES),
        hours: hoursForThisActivity,
        date: subDays(epochDay, faker.number.int({ min: 7, max: 330 })).toISOString(),
      })
    }
  })

  return activities
}

/**
 * Build the entire demo world in one deterministic, causally-ordered pass.
 * Entity identities are fixed by `faker.seed(42)`; every date floats relative
 * to `epoch`, the moment the seed runs in the viewer's browser (ADR-0002).
 */
export function seedDemo(epoch: Date): SeedSnapshot {
  faker.seed(42)

  const plans = planCourses(epoch)
  const teacherCount = 6

  const teachers = buildTeachers(epoch, teacherCount)
  const courses = buildCourses(epoch, plans, teachers)

  // Back-reference: each teacher owns the courses they teach.
  courses.forEach((course) => {
    const teacher = teachers.find((t) => t.id === course.teacherId)
    if (teacher && !teacher.courseIds.includes(course.id)) teacher.courseIds.push(course.id)
  })

  const earliestTermStart = new Date(
    Math.min(...courses.map((c) => startOfDay(new Date(c.term.start)).getTime()))
  )

  const personaSede = teachers[TEACHER_PERSONA_INDEX]?.sede ?? SEDES[0]
  const students = buildStudents(epoch, 24, earliestTermStart, personaSede)
  const enrollments = buildEnrollments(epoch, students, courses)

  // Back-reference: each student lists the courses they enrolled in.
  enrollments.forEach((enrollment) => {
    const student = students.find((s) => s.id === enrollment.studentId)
    if (student && !student.enrolledCourseIds.includes(enrollment.courseId)) {
      student.enrolledCourseIds.push(enrollment.courseId)
    }
  })

  const attendance = buildAttendance(epoch, enrollments, courses)

  // The golden-path Course is the one just-ended cohort the teacher persona has
  // yet to grade; every other ended Course is graded.
  const goldenPathCourse = courses.find((_, i) => plans[i]?.role === 'just-ended')
  if (!goldenPathCourse) {
    throw new Error('seed plan must include exactly one just-ended course')
  }
  const grades = buildGrades(epoch, enrollments, courses, goldenPathCourse.id)
  const tcuTrainees = buildTcuTrainees(epoch)
  const tcuActivities = buildTcuActivities(epoch, tcuTrainees)

  const auditLog = buildAuditLog({ teachers, students, courses, enrollments, grades })
  const emailCampaigns = buildEmailCampaigns(epoch, students, courses, enrollments)

  return {
    demoEpoch: epoch.toISOString(),
    offset: 0,
    teachers,
    courses,
    students,
    enrollments,
    grades,
    certificates: buildCertificates(epoch, grades),
    tcuTrainees,
    tcuActivities,
    attendance,
    auditLog,
    emailCampaigns,
  }
}
