import { faker, Faker, en } from '@faker-js/faker'
import {
  addDays,
  addWeeks,
  differenceInDays,
  format,
  startOfDay,
  subDays,
  subWeeks,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type {
  Student,
  Teacher,
  Course,
  CourseLevel,
  Enrollment,
  EnrollmentStatus,
  Grade,
  Certificate,
  Program,
  TcuActivity,
  TcuTrainee,
  AttendanceRecord,
  AttendanceStatus,
  AuditLogEntry,
  EmailCampaign,
  SessionException,
  Weekday,
} from '@/types'
import { sessionsFor } from '@/lib/sessions'
import { emitCertificatesForClose } from '@/lib/certificates'
import { resolveRecipients } from '@/lib/emailRecipients'
import { PROGRAM_CATALOG } from '@/constants/programs'
import { UNIVERSITIES, type University } from '@/constants/university'
import { SEDES, type Sede } from '@/constants/sede'
import {
  GENDERS,
  PROVINCES,
  CANTONS_BY_PROVINCE,
  GUARDIAN_RELATIONSHIPS,
} from '@/constants/student'
import { CR_FIRST_NAMES, CR_LAST_NAMES } from '@/constants/names'

export interface SeedSnapshot {
  // The explicit Demo Epoch (ADR-0014): the frozen instant the clock reads as
  // "now". Persisted so a returning visitor's filters and write timestamps read
  // the same frozen epoch the seeded dates were anchored to. `offset` shifts the
  // clock for a later date-travel feature; we ship frozen, so it starts at 0.
  demoEpoch: string
  offset: number
  programs: Program[]
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  certificates: Certificate[]
  tcuTrainees: TcuTrainee[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
  sessionExceptions: SessionException[]
  auditLog: AuditLogEntry[]
  emailCampaigns: EmailCampaign[]
}

// The seeded teacher persona (the current user behind the 'teacher' role) owns
// the just-ended, ungraded Course — the golden-path runway for the
// teacher-grades → teacher-closes → student-downloads story (ADR-0024).
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
  ['mon', 'wed'],
  ['tue', 'thu'],
  ['mon', 'wed', 'fri'],
  ['tue', 'thu'],
  ['mon', 'wed'],
  ['tue', 'thu', 'fri'],
  ['mon', 'wed'],
  ['tue', 'thu'],
]

// 16 course templates (each runs at multiple sedes, creating 24 cohorts).
// Every Course is a single level (ADR-0020). The teacher persona's courses
// (indices 0 and 4) are 'primaria' to match the student persona stu-1
// (educationalLevel 'primaria'), keeping the golden path eligible. Levels are
// balanced 8 primaria / 8 secundaria across the 24 cohorts.
const COURSE_LEVEL_PATTERN: CourseLevel[] = [
  'primaria', // 0: completed, 3 sedes (persona's golden-path)
  'secundaria', // 1: completed
  'secundaria', // 2: completed
  'primaria', // 3: completed
  'primaria', // 4: just-ended, 3 sedes (persona's golden-path)
  'primaria', // 5: in-progress
  'secundaria', // 6: in-progress
  'secundaria', // 7: in-progress
  'primaria', // 8: in-progress
  'secundaria', // 9: in-progress, 3 sedes
  'primaria', // 10: in-progress
  'secundaria', // 11: in-progress
  'primaria', // 12: upcoming
  'secundaria', // 13: upcoming
  'secundaria', // 14: upcoming, 3 sedes
  'primaria', // 15: upcoming
]

// Spanish level labels for Course names (ADR-0021). The stored Course name is
// catalog-style data like the Spanish-only Program names — it is never passed
// through t(); the level is still rendered bilingually elsewhere via t().
const COURSE_LEVEL_LABEL_ES: Record<CourseLevel, string> = {
  primaria: 'Primaria',
  secundaria: 'Secundaria',
}

// Catalog-style seed data rendered raw (a.title), never passed through t() —
// so it ships in Spanish like the Program/Course names above (ADR-0021).
const TCU_ACTIVITY_TITLES = [
  'Día de lectura en la biblioteca comunitaria',
  'Campaña de limpieza del parque',
  'Visita al hogar de ancianos',
  'Colecta de útiles escolares',
  'Taller de concientización ambiental',
  'Voluntariado en el banco de alimentos',
  'Sesión de tutoría juvenil',
  'Feria de salud pública',
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
 * 16 course templates positioned relative to the Demo Epoch (ADR-0002).
 * Distribution creates ~8 completed / ~10 in-progress / ~6 upcoming cohorts total.
 * buildCourses runs these at 1–3 Sedes each to create 24 cohorts.
 */
function planCourses(epoch: Date): CoursePlan[] {
  const day = startOfDay(epoch)
  return [
    // Completed (indices 0-3)
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
    {
      role: 'completed',
      teacherIndex: 2,
      termStart: subWeeks(day, 22),
      termEnd: subWeeks(day, 14),
    },
    {
      role: 'completed',
      teacherIndex: 5,
      termStart: subWeeks(day, 25),
      termEnd: subWeeks(day, 17),
    },

    // Just-ended (index 4, persona's golden-path course)
    { role: 'just-ended', teacherIndex: 0, termStart: subWeeks(day, 14), termEnd: subDays(day, 8) },

    // In-progress (indices 5-11)
    {
      role: 'in-progress',
      teacherIndex: 3,
      termStart: subWeeks(day, 18),
      termEnd: subWeeks(day, 2),
    },
    {
      role: 'in-progress',
      teacherIndex: 4,
      termStart: subWeeks(day, 16),
      termEnd: addWeeks(day, 2),
    },
    {
      role: 'in-progress',
      teacherIndex: 1,
      termStart: subWeeks(day, 3),
      termEnd: addWeeks(day, 9),
    },
    {
      role: 'in-progress',
      teacherIndex: 2,
      termStart: subWeeks(day, 5),
      termEnd: addWeeks(day, 7),
    },
    {
      role: 'in-progress',
      teacherIndex: 3,
      termStart: subWeeks(day, 7),
      termEnd: addWeeks(day, 5),
    },
    {
      role: 'in-progress',
      teacherIndex: 4,
      termStart: subWeeks(day, 2),
      termEnd: addWeeks(day, 10),
    },
    {
      role: 'in-progress',
      teacherIndex: 5,
      termStart: subWeeks(day, 4),
      termEnd: addWeeks(day, 8),
    },

    // Upcoming (indices 12-15)
    { role: 'upcoming', teacherIndex: 0, termStart: addDays(day, 10), termEnd: addWeeks(day, 14) },
    { role: 'upcoming', teacherIndex: 1, termStart: addDays(day, 14), termEnd: addWeeks(day, 18) },
    { role: 'upcoming', teacherIndex: 2, termStart: addDays(day, 12), termEnd: addWeeks(day, 16) },
    { role: 'upcoming', teacherIndex: 3, termStart: addDays(day, 16), termEnd: addWeeks(day, 20) },
  ]
}

// Slugify a name part for use in an email local-part: strip accents, lowercase,
// drop anything that isn't a-z.
const COMBINING_MARKS = /[̀-ͯ]/g
function emailSlug(part: string): string {
  return part
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

// Derive a `firstname.lastname@fundavida.es` address from a person's name,
// appending a numeric suffix on collision so every seeded email is unique.
function makePersonEmail(firstName: string, lastName: string, seen: Set<string>): string {
  const base = `${emailSlug(firstName)}.${emailSlug(lastName)}`
  let candidate = `${base}@fundavida.es`
  let n = 2
  while (seen.has(candidate)) {
    candidate = `${base}${n}@fundavida.es`
    n += 1
  }
  seen.add(candidate)
  return candidate
}

// Overwrite every person's name + email (and each student's canton) with Costa
// Rican data AFTER the structural graph is built. Critically this uses its OWN
// faker instance: the main RNG drives every structural decision (enrollments,
// attendance, grades, TCU course assignments), so localizing here keeps that
// sequence byte-identical to a world seeded with plain faker names. Drawing CR
// names from the main faker instead would shift the stream and reshuffle the
// whole graph. Canton is drawn from the student's own province so the pair stays
// coherent (replaces the prior random global-city value).
function localizePeople(teachers: Teacher[], students: Student[], trainees: TcuTrainee[]): void {
  const nameRng = new Faker({ locale: [en] })
  nameRng.seed(42)
  const emails = new Set<string>()

  // A Costa Rican mobile number: 8 digits starting 6/7/8, formatted "8888-8888".
  const crPhone = (): string => {
    const lead = nameRng.helpers.arrayElement(['6', '7', '8'])
    const rest = nameRng.string.numeric({ length: 7, allowLeadingZeros: true })
    return `${lead}${rest.slice(0, 3)}-${rest.slice(3)}`
  }

  const rename = (person: { firstName: string; lastName: string; email: string }): void => {
    person.firstName = nameRng.helpers.arrayElement(CR_FIRST_NAMES)
    person.lastName = nameRng.helpers.arrayElement(CR_LAST_NAMES)
    person.email = makePersonEmail(person.firstName, person.lastName, emails)
  }

  teachers.forEach((teacher) => {
    rename(teacher)
    const province = nameRng.helpers.arrayElement(PROVINCES)
    teacher.province = province
    teacher.canton = nameRng.helpers.arrayElement(CANTONS_BY_PROVINCE[province])
  })
  students.forEach((student) => {
    rename(student)
    const cantons = CANTONS_BY_PROVINCE[student.province as keyof typeof CANTONS_BY_PROVINCE]
    if (cantons) student.canton = nameRng.helpers.arrayElement(cantons)

    // The encargado (guardian): a Costa Rican adult with their own gmail contact.
    const guardianFirst = nameRng.helpers.arrayElement(CR_FIRST_NAMES)
    const guardianLast = nameRng.helpers.arrayElement(CR_LAST_NAMES)
    student.guardian = {
      name: `${guardianFirst} ${guardianLast}`,
      relationship: nameRng.helpers.arrayElement(GUARDIAN_RELATIONSHIPS),
      phone: crPhone(),
      email: `${emailSlug(guardianFirst)}.${emailSlug(guardianLast)}@gmail.com`,
    }
  })
  trainees.forEach(rename)
}

function buildTeachers(epoch: Date, count: number): Teacher[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `tea-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    // 3 Teachers per Sede: i=0,3,6→sede0; i=1,4,7→sede1; i=2,5,8→sede2
    sede: SEDES[i % SEDES.length] as Sede,
    // Placeholder filled by localizePeople (separate RNG) so the home location
    // never perturbs the structural sequence.
    province: '',
    canton: '',
    courseIds: [],
    // Teachers predate every Course they could teach.
    createdAt: subDays(epoch, 420 + faker.number.int({ min: 0, max: 180 })).toISOString(),
  }))
}

function buildCourses(epoch: Date, plans: CoursePlan[], teachers: Teacher[]): Course[] {
  const sedeByTeacherId = new Map(teachers.map((t) => [t.id, t.sede]))
  const courseIdCounter = { val: 1 }

  // Create 24 cohorts from 16 templates:
  // - 3 templates run at 3 Sedes = 9 cohorts (0, 4, 14)
  // - 2 templates run at 2 Sedes = 4 cohorts (1, 3)
  // - 11 templates run at 1 Sede = 11 cohorts
  // - Total = 9 + 4 + 11 = 24
  const allSedesTemplates = [0, 4, 14] // Run at 3 sedes each (3 support courses, AC requirement)
  const doubleRunTemplates = [1, 3] // Templates that run at 2 sedes
  const courses: Course[] = []

  plans.forEach((plan, templateIndex) => {
    const termStart = startOfDay(plan.termStart)
    const termEnd = startOfDay(plan.termEnd)
    const created = subDays(termStart, faker.number.int({ min: 7, max: 30 }))
    const createdAt = (created > epoch ? subDays(startOfDay(epoch), 1) : created).toISOString()

    const teacherId = `tea-${plan.teacherIndex + 1}`
    const program = PROGRAM_CATALOG[templateIndex % PROGRAM_CATALOG.length] as Program
    const level = COURSE_LEVEL_PATTERN[templateIndex] as CourseLevel
    const meetingDays = MEETING_DAY_PATTERNS[templateIndex] as Weekday[]

    // Determine which sedes this template runs at
    let sedesToRun: Sede[]
    if (allSedesTemplates.includes(templateIndex)) {
      // These templates run at all 3 sedes (support courses, AC requirement)
      sedesToRun = [...SEDES]
    } else if (doubleRunTemplates.includes(templateIndex)) {
      // These courses run at 2 sedes (base sede + next one)
      const baseTeacherSede = sedeByTeacherId.get(teacherId)
      if (!baseTeacherSede) {
        sedesToRun = [SEDES[0]]
      } else {
        const baseIndex = SEDES.indexOf(baseTeacherSede as Sede)
        sedesToRun = [baseTeacherSede as Sede, SEDES[(baseIndex + 1) % SEDES.length] as Sede]
      }
    } else {
      // Most courses run at the teacher's sede only
      const teacherSede = sedeByTeacherId.get(teacherId)
      sedesToRun = [teacherSede ?? SEDES[0]]
    }

    sedesToRun.forEach((sede) => {
      // Find a teacher at this Sede
      let cohortTeacherId = teacherId
      if (sedeByTeacherId.get(teacherId) !== sede) {
        // Swap to a teacher at this sede with matching role
        const sedeTeachers = teachers.filter((t) => t.sede === sede)
        const indexAtSede = plan.teacherIndex % sedeTeachers.length
        cohortTeacherId = sedeTeachers[indexAtSede]?.id ?? teacherId
      }

      const courseId = `cou-${courseIdCounter.val++}`
      // Human, self-describing cohort name (ADR-0021): Program, level, Sede, and
      // the term month to disambiguate cohorts that share program/level/sede.
      const cohortPeriod = format(termStart, 'MMM yyyy', { locale: es })
      courses.push({
        id: courseId,
        name: `${program.name} ${COURSE_LEVEL_LABEL_ES[level]} — ${sede} (${cohortPeriod})`,
        description: program.description,
        sede,
        programId: program.id,
        level,
        // Completed cohorts are closed — a Teacher ran the close ceremony, which
        // emitted their Certificates (ADR-0024). Every other role stays published.
        status: plan.role === 'completed' ? 'closed' : 'published',
        capacity: 20 + (templateIndex % 3) * 5,
        teacherId: cohortTeacherId,
        term: { start: termStart.toISOString(), end: termEnd.toISOString() },
        meetingDays,
        createdAt,
      })
    })
  })

  return courses
}

function buildStudents(
  epoch: Date,
  count: number,
  earliestTermStart: Date,
  personaSede: Sede
): Student[] {
  const recentFromIndex = count - RECENT_JOINER_COUNT
  const studentsPerSede = count / SEDES.length
  return Array.from({ length: count }, (_, i) => {
    // Distribute students evenly across sedes (28 per sede)
    const sedeIndex = Math.floor(i / studentsPerSede)
    const sede = SEDES[sedeIndex] as Sede

    // stu-1 shares the teacher persona's Sede; others are distributed
    const studentSede = i === 0 ? personaSede : sede

    // Names, email, and canton are localized post-build (see localizePeople) so
    // they never perturb the structural RNG. Here we keep the original draws:
    // province from the canonical list, canton a placeholder city.
    return {
      id: `stu-${i + 1}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      gender: faker.helpers.arrayElement(GENDERS),
      sede: studentSede,
      province: faker.helpers.arrayElement(PROVINCES),
      canton: faker.location.city(),
      // Placeholder filled by localizePeople (separate RNG) so the encargado
      // never perturbs the structural sequence.
      guardian: { name: '', relationship: 'otro', phone: '', email: '' },
      // ~50/50 distribution: even indices primaria, odd secundaria
      educationalLevel: i % 2 === 0 ? 'primaria' : 'secundaria',
      enrolledCourseIds: [],
      // Most students predate the earliest Term; the last few are recent joiners
      // (created within the trailing window) so the dashboard shows real growth.
      createdAt: (i >= recentFromIndex
        ? subDays(epoch, faker.number.int({ min: 2, max: RECENT_JOINER_MAX_AGE_DAYS }))
        : subDays(earliestTermStart, 21 + faker.number.int({ min: 0, max: 200 }))
      ).toISOString(),
    }
  })
}

/**
 * Enrollments are placed near each Course's Term start (you sign up shortly
 * before a cohort begins), always on or after the student's creation and never
 * in the future. The teacher persona's student (stu-1) is deliberately enrolled
 * in the persona's completed Course (so they have a Grade) and the just-ended
 * one (the golden-path runway).
 *
 * Most are approved, but a few are pending/rejected/withdrawn to show the
 * approval lifecycle in action (ADR-0016).
 */
function buildEnrollments(epoch: Date, students: Student[], courses: Course[]): Enrollment[] {
  const epochDay = startOfDay(epoch)
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const personaCourses = courses
    .filter((c) => c.teacherId === `tea-${TEACHER_PERSONA_INDEX + 1}`)
    .map((c) => c.id)

  const enrollments: Enrollment[] = []
  let counter = 0
  let statusCounter = 0

  students.forEach((student, si) => {
    // A Student may only enrol in Courses at their own Sede (ADR-0011) and whose
    // Level matches theirs (ADR-0020). The persona (stu-1) shares tea-1's Sede and
    // tea-1's Courses are 'primaria' like stu-1, so the persona's Courses qualify.
    const isEligible = (c: Course) =>
      c.sede === student.sede && c.level === student.educationalLevel
    const eligibleCourseIds = courses.filter(isEligible).map((c) => c.id)
    const isRecentJoiner = si >= students.length - RECENT_JOINER_COUNT
    let courseIds: string[]
    if (si === 0) {
      courseIds = personaCourses
    } else if (isRecentJoiner) {
      // Recent joiners only sign up for cohorts that have not started yet, so
      // they never accrue attendance or grades dated before they existed.
      courseIds = courses
        .filter(
          (c) => isEligible(c) && startOfDay(new Date(c.term.start)).getTime() > epochDay.getTime()
        )
        .map((c) => c.id)
    } else if (eligibleCourseIds.length === 0) {
      courseIds = []
    } else {
      courseIds = faker.helpers.arrayElements(
        eligibleCourseIds,
        faker.number.int({ min: 1, max: Math.min(3, eligibleCourseIds.length) })
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
      const enrolledAtIso = enrolledAt.toISOString()

      // Most enrollments are approved; a few (15-20%) are pending/rejected/withdrawn
      let status: EnrollmentStatus = 'approved'
      let decidedBy: string | undefined = 'admin'
      let decidedAt: string | undefined = enrolledAtIso
      const statusRoll = statusCounter++ % 20
      if (statusRoll === 0) status = 'pending'
      if (statusRoll === 1) {
        status = 'rejected'
        decidedBy = 'admin'
        decidedAt = addDays(new Date(enrolledAtIso), 3).toISOString()
      }
      if (statusRoll === 2) {
        status = 'withdrawn'
        decidedBy = student.id
        decidedAt = addDays(new Date(enrolledAtIso), 5).toISOString()
      }

      enrollments.push({
        id: `enr-${(counter += 1)}`,
        studentId: student.id,
        courseId,
        enrolledAt: enrolledAtIso,
        status,
        requestedAt: enrolledAtIso,
        decidedBy: status === 'pending' ? undefined : decidedBy,
        decidedAt: status === 'pending' ? undefined : decidedAt,
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
 * A Certificate is emitted when a Course closes (ADR-0024): one per Student with
 * an *approved* Enrollment in the closed Course AND a passing Grade, immediately
 * downloadable. The seed emits through the app's shared rule (ADR-0034,
 * `emitCertificatesForClose`) so a withdrawn/rejected Student never earns one —
 * only the id and `issuedAt` stay seed-specific: dated a few days after the
 * Grade was issued (the stand-in close instant), never in the future, and
 * `cert-${i+1}` after the existing deterministic sort.
 */
function buildCertificates(
  epoch: Date,
  enrollments: Enrollment[],
  grades: Grade[],
  closedCourseIds: Set<string>
): Certificate[] {
  const epochDay = startOfDay(epoch)
  const gradeByPair = new Map(grades.map((g) => [`${g.studentId}:${g.courseId}`, g]))

  const seeds = [...closedCourseIds].flatMap((id) =>
    emitCertificatesForClose({ id }, enrollments, grades)
  )

  const dated = seeds
    .flatMap((seed) => {
      // Every emitted seed has a passing Grade by construction, so the lookup
      // always hits; the guard keeps the type non-nullable without an assertion.
      const grade = gradeByPair.get(`${seed.studentId}:${seed.courseId}`)
      return grade ? [{ seed, grade }] : []
    })
    .sort((a, b) =>
      a.grade.issuedAt < b.grade.issuedAt ? -1 : a.grade.issuedAt > b.grade.issuedAt ? 1 : 0
    )

  return dated.map(({ seed, grade }, i) => {
    // Issued a few days after the Grade, standing in for the close instant; capped
    // at the epoch so it is never in the future.
    let issuedAt = addDays(new Date(grade.issuedAt), faker.number.int({ min: 1, max: 7 }))
    if (issuedAt > epochDay) issuedAt = epochDay
    return {
      id: `cert-${i + 1}`,
      studentId: seed.studentId,
      courseId: seed.courseId,
      score: seed.score,
      issuedAt: issuedAt.toISOString(),
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
  // The filter targets it by id (ADR-0015); the subject/body show its Spanish name.
  const programId = firstCourse.programId
  const programName = PROGRAM_CATALOG.find((p) => p.id === programId)?.name ?? programId
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
      subject: `${programName} program: upcoming session`,
      body: `${programName} students — a reminder about your upcoming sessions and what to bring.`,
      filter: { kind: 'program', value: programId },
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
 *
 * 15 volunteers assigned to courses: one per course for ~15 of the 24 courses,
 * with <=3 per course. Each shares its assigned Course's Sede (ADR-0017).
 * Universities are Spanish proper nouns.
 */
function buildTcuTrainees(epoch: Date, courses: Course[]): TcuTrainee[] {
  const count = 15
  const trainees: TcuTrainee[] = []

  // Distribute 15 trainees across 24 courses (~15/24 courses have a volunteer)
  const selectedCourses = faker.helpers.arrayElements(courses, count)

  selectedCourses.forEach((course, i) => {
    const university = UNIVERSITIES[i % UNIVERSITIES.length] as University
    trainees.push({
      id: `tcu-${i + 1}`, // tcu-1 is the seeded TCU persona
      // Name + email localized post-build (see localizePeople).
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      sede: course.sede,
      university: university.name,
      courseId: course.id,
      createdAt: subDays(epoch, faker.number.int({ min: 30, max: 210 })).toISOString(),
    })
  })

  return trainees
}

/**
 * Community-service activities logged by TCU Trainees, dated within the year
 * before the epoch. Each trainee has a mix of activities with realistic
 * partial progress toward the 300-hour requirement.
 *
 * A logged activity is `pending` until the assigned Course's Teacher approves
 * it (ADR-0017). The seed mirrors that story: each trainee's most recent
 * activity stays pending (a queue for the Teacher), the rest are approved by the
 * trainee's assigned-Course Teacher.
 */
function buildTcuActivities(epoch: Date, trainees: TcuTrainee[], courses: Course[]): TcuActivity[] {
  const epochDay = startOfDay(epoch)
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const activities: TcuActivity[] = []
  let counter = 0

  trainees.forEach((trainee) => {
    // TCU persona has more activities (closer to goal); others have fewer
    const isPersona = trainee.id === TCU_PERSONA_ID
    const maxActivitiesPerTrainee = isPersona ? 10 : faker.number.int({ min: 4, max: 8 })
    const targetHours = isPersona ? 220 : faker.number.int({ min: 80, max: 180 })
    let accumulatedHours = 0

    // The persona logs longer sessions so its progress reads clearly "well under
    // way" (comfortably above zero, still short of 300); others log shorter ones.
    const hoursRange = isPersona ? { min: 8, max: 16 } : { min: 2, max: 8 }
    const traineeActivities: TcuActivity[] = []
    for (let i = 0; i < maxActivitiesPerTrainee && accumulatedHours < targetHours; i += 1) {
      const hoursForThisActivity = Math.min(
        faker.number.int(hoursRange),
        targetHours - accumulatedHours
      )
      accumulatedHours += hoursForThisActivity

      const index = (counter += 1)
      traineeActivities.push({
        id: `tcu-act-${index}`,
        traineeId: trainee.id,
        title: faker.helpers.arrayElement(TCU_ACTIVITY_TITLES),
        hours: hoursForThisActivity,
        date: subDays(epochDay, faker.number.int({ min: 7, max: 330 })).toISOString(),
        status: 'pending',
      })
    }

    // The assigned Course's Teacher approves the work (ADR-0017). Leave the most
    // recent activity pending so the Teacher's approval queue is non-empty.
    const approver = courseById.get(trainee.courseId)?.teacherId ?? 'admin'
    const byDateAsc = [...traineeActivities].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    )
    const approvedCutoff = Math.max(0, byDateAsc.length - 1)
    byDateAsc.forEach((activity, i) => {
      if (i >= approvedCutoff) return
      let approvedAt = addDays(new Date(activity.date), faker.number.int({ min: 1, max: 7 }))
      if (approvedAt > epochDay) approvedAt = epochDay
      activity.status = 'approved'
      activity.approvedBy = approver
      activity.approvedAt = approvedAt.toISOString()
    })

    activities.push(...traineeActivities)
  })

  return activities
}

/**
 * Build the entire demo world in one deterministic, causally-ordered pass.
 * Entity identities are fixed by `faker.seed(42)`; every date floats relative
 * to `epoch`, the moment the seed runs in the viewer's browser (ADR-0002).
 *
 * 24 Course cohorts from 16 templates (ADR-0015-0017).
 * 9 Teachers (3 per Sede), 84 Students (28 per Sede), 15 TCU Volunteers.
 */
/**
 * A small overlay of Session deviations (ADR-0039) so the calendar and the
 * Sessions surface demonstrate cancel/reschedule without manual setup. Both land
 * on the teacher persona's upcoming cohort — every Session is future, so they
 * satisfy the store's future-only + attendance-free guards. Deterministic (no
 * faker draw), so the RNG sequence and every seeded count are unchanged.
 */
function buildSessionExceptions(epoch: Date, courses: Course[]): SessionException[] {
  const epochDay = startOfDay(epoch)
  const demoCourse = courses.find(
    (c) =>
      c.teacherId === `tea-${TEACHER_PERSONA_INDEX + 1}` &&
      startOfDay(new Date(c.term.start)) > epochDay
  )
  if (!demoCourse) return []

  const sessions = sessionsFor(demoCourse)
  const toCancel = sessions[1]
  const toReschedule = sessions[3]
  if (!toCancel || !toReschedule) return []

  // A day after the base Session: never a Meeting Day for this cohort's pattern,
  // so the reschedule target never collides with another effective Session.
  const rescheduledTo = addDays(startOfDay(new Date(toReschedule.date)), 1).toISOString()
  const createdAt = subDays(epochDay, 1).toISOString()

  return [
    {
      id: 'sxc-1',
      courseId: demoCourse.id,
      type: 'cancelled',
      date: toCancel.date,
      note: 'Feriado',
      createdAt,
    },
    {
      id: 'sxc-2',
      courseId: demoCourse.id,
      type: 'rescheduled',
      date: toReschedule.date,
      newDate: rescheduledTo,
      note: 'Aula no disponible',
      createdAt,
    },
  ]
}

export function seedDemo(epoch: Date): SeedSnapshot {
  faker.seed(42)

  const plans = planCourses(epoch)
  const teacherCount = 9

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
  const students = buildStudents(epoch, 84, earliestTermStart, personaSede)
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
  // Find the just-ended course: it ended recently (within ~14 days) and belongs to tea-1
  const epochDay = startOfDay(epoch)
  const justEndedCourses = courses.filter((c) => {
    const termEnd = startOfDay(new Date(c.term.end))
    const daysSinceEnd = differenceInDays(epochDay, termEnd)
    return (
      daysSinceEnd >= 1 && daysSinceEnd <= 14 && c.teacherId === `tea-${TEACHER_PERSONA_INDEX + 1}`
    )
  })
  const goldenPathCourse = justEndedCourses[0]
  if (!goldenPathCourse) {
    throw new Error('seed plan must include exactly one just-ended course for the teacher persona')
  }
  const grades = buildGrades(epoch, enrollments, courses, goldenPathCourse.id)

  // Demo polish (ADR-0019): grade a few students in the persona Teacher's
  // golden-path Course so their Certificate worklist spans a second Course and the
  // by-course filter has something to filter. We grade only a handful and leave the
  // rest ungraded, so the golden-path runway (issue #72: the teacher still has
  // grading to do) is intact. Scores are fixed (no faker draw) and this runs after
  // every faker draw, so neither the RNG sequence nor any seeded count shifts. The
  // grade timestamp mirrors buildGrades: shortly after the Term ended, never future.
  const goldenRoster = enrollments.filter((e) => e.courseId === goldenPathCourse.id)
  const goldenGradeCount = Math.min(3, Math.max(0, goldenRoster.length - 1))
  const goldenTermEnd = startOfDay(new Date(goldenPathCourse.term.end))
  const goldenIssuedAt = (
    addDays(goldenTermEnd, 3) > epochDay ? epochDay : addDays(goldenTermEnd, 3)
  ).toISOString()
  const goldenScores = [92, 84, 97]
  for (let i = 0; i < goldenGradeCount; i++) {
    const enrollment = goldenRoster[i]
    if (!enrollment) break
    grades.push({
      id: `gra-golden-${i + 1}`,
      studentId: enrollment.studentId,
      courseId: goldenPathCourse.id,
      score: goldenScores[i] ?? 90,
      issuedAt: goldenIssuedAt,
    })
  }

  const tcuTrainees = buildTcuTrainees(epoch, courses)

  // Localize names/emails/cantons now that the whole structural graph exists and
  // all main-RNG draws are done — so the audit log below records CR names.
  localizePeople(teachers, students, tcuTrainees)

  const tcuActivities = buildTcuActivities(epoch, tcuTrainees, courses)

  const auditLog = buildAuditLog({ teachers, students, courses, enrollments, grades })
  const emailCampaigns = buildEmailCampaigns(epoch, students, courses, enrollments)

  return {
    demoEpoch: epoch.toISOString(),
    offset: 0,
    // The fixed program catalog (ADR-0015) — read-only, org-wide, part of the
    // persisted shape so a Course's programId always resolves.
    programs: PROGRAM_CATALOG.map((p) => ({ ...p })),
    teachers,
    courses,
    students,
    enrollments,
    grades,
    certificates: buildCertificates(
      epoch,
      enrollments,
      grades,
      new Set(courses.filter((c) => c.status === 'closed').map((c) => c.id))
    ),
    tcuTrainees,
    tcuActivities,
    attendance,
    sessionExceptions: buildSessionExceptions(epoch, courses),
    auditLog,
    emailCampaigns,
  }
}
