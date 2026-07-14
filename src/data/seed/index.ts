// The deep `locale/en` entry instead of the root barrel (#353): the barrel
// statically re-exports every locale, and any chunk-splitting rule whose
// closure touches it force-includes them all (~2.7 MB minified vs ~450 kB).
// The `Faker` type import is erased at runtime, so it keeps the graph clean.
import { faker } from '@faker-js/faker/locale/en'
import type { Faker, LocaleDefinition } from '@faker-js/faker'
import {
  addDays,
  addWeeks,
  differenceInDays,
  endOfMonth,
  format,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfMonth,
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
  Announcement,
  Weekday,
} from '@/types'
import {
  effectiveSessions,
  sessionsFor,
  isSessionRecordable,
  weekdayToNumber,
} from '@/lib/sessions'
import { courseDisplayState } from '@/lib/courseDisplayState'
import { emitCertificatesForClose } from '@/lib/certificates'
import { resolveRecipients } from '@/lib/emailRecipients'
import { fullName } from '@/lib/personName'
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
  announcements: Announcement[]
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
      // Reassigned to the teacher persona (tea-1) so it lands on their live week
      // (ADR-0044). NOT a new plan entry — the Course count and faker RNG stream
      // stay stable. tue/thu, secundaria; runs at tea-1's Sede (Linda Vista).
      role: 'in-progress',
      teacherIndex: 0,
      termStart: subWeeks(day, 7),
      termEnd: addWeeks(day, 5),
    },
    {
      // Reassigned to the teacher persona (tea-1) for the same reason (ADR-0044).
      // mon/wed/fri, primaria — so the student persona (stu-1, primaria, same
      // Sede) auto-enrols in it via the existing personaCourses path.
      role: 'in-progress',
      teacherIndex: 0,
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
  // The Faker class is reached through the singleton's constructor rather than
  // the root barrel (see the import note at the top of this file). The locale
  // passed here is irrelevant to the stream — every nameRng draw is
  // locale-independent (helpers/string) — and the seeded Mersenne sequence is
  // identical to the previous `new Faker({ locale: [en] })`, so the seeded
  // world stays byte-for-byte the same.
  const FakerClass = faker.constructor as new (options: {
    locale: LocaleDefinition | LocaleDefinition[]
  }) => Faker
  const nameRng = new FakerClass({ locale: faker.rawDefinitions })
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
      // The persona (stu-1) enrols in tea-1's cohorts — but only those matching
      // stu-1's Level (ADR-0020). tea-1 now owns an in-progress secundaria cohort
      // (ADR-0044); the unfiltered list would place the primaria persona in a
      // wrong-level Course, which the store's enroll guard would reject.
      courseIds = personaCourses.filter((id) => {
        const c = courseById.get(id)
        return c ? isEligible(c) : false
      })
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

      // Most enrollments are approved; a few (15-20%) are pending/rejected/withdrawn.
      let status: EnrollmentStatus = 'approved'
      let decidedBy: string | undefined = 'admin'
      let decidedAt: string | undefined = enrolledAtIso
      // The roll always advances so the status stream (and thus the RNG-free
      // status distribution) for every non-persona Student is unchanged. The
      // persona (stu-1) is exempt: as the golden-path protagonist it must be
      // approved in its live cohort (ADR-0044) and its just-ended runway
      // (ADR-0024), not left to the lottery — a shift in its course list would
      // otherwise flip the live enrolment to withdrawn and strand it on an empty
      // calendar week.
      const statusRoll = statusCounter++ % 20
      if (si !== 0) {
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
 * The Sessions of a Course that seed attendance is recorded for (ADR-0001,
 * ADR-0044). Read off the *effective* schedule (ADR-0039), so a cancelled class
 * carries no attendance and a rescheduled one carries its attendance to the day it
 * actually met — the overlay is part of what happened, not a later edit to it.
 *
 * In-progress Courses (Term contains the epoch) are the calendar's live worklist,
 * so every recordable Session is marked *except the most recent one* — leaving a
 * single fresh class to mark per active Course, the "well-run school with a little
 * left to do" story instead of an all-time backlog. Every other Course keeps the
 * historic pattern: the ten most recent strictly-past Sessions (a term-ended
 * Course's older gaps stay unmarked, which is close-readiness's business, not the
 * calendar's).
 */
function markedSessionsFor(
  course: Course,
  epoch: Date,
  exceptions: SessionException[]
): ReturnType<typeof sessionsFor> {
  const sessions = effectiveSessions(course, exceptions)
  if (courseDisplayState(course, epoch) === 'inProgress') {
    const recordable = sessions.filter((s) => isSessionRecordable(s, epoch))
    return recordable.slice(0, Math.max(0, recordable.length - 1))
  }
  const epochDay = startOfDay(epoch)
  return sessions
    .filter((s) => startOfDay(new Date(s.date)).getTime() < epochDay.getTime())
    .slice(-10)
}

/**
 * Attendance is recorded per derived Session (ADR-0001): for every enrollment,
 * the Sessions {@link markedSessionsFor} selects. Records bind to real Sessions
 * by construction, so an attendance date can never land where no class met — not
 * even on a Session the overlay cancelled or moved (ADR-0039).
 */
function buildAttendance(
  epoch: Date,
  enrollments: Enrollment[],
  courses: Course[],
  exceptions: SessionException[]
): AttendanceRecord[] {
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const records: AttendanceRecord[] = []
  let counter = 0

  enrollments.forEach((enrollment) => {
    const course = courseById.get(enrollment.courseId)
    if (!course) return
    markedSessionsFor(course, epoch, exceptions).forEach((session) => {
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
      summary: `Created teacher ${fullName(t)}`,
    })
  )
  students.forEach((s) =>
    push({
      actorId: 'admin',
      action: 'create',
      entity: 'student',
      entityId: s.id,
      timestamp: s.createdAt,
      summary: `Created student ${fullName(s)}`,
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

  // The teacher persona (tea-1) owns a Course they can message the class of
  // (ADR-0041): seed one Teacher-authored, course-scoped campaign so their
  // 'own'-scoped history is not empty and the guardian audience has a demo home.
  const teacherId = `tea-${TEACHER_PERSONA_INDEX + 1}`
  const teacherCourse = courses.find((c) => c.teacherId === teacherId)

  const specs: {
    id: string
    subject: string
    body: string
    filter: EmailCampaign['filter']
    audience: EmailCampaign['audience']
    sentBy: string
    weeksAgo: number
  }[] = [
    {
      id: 'cam-1',
      subject: 'Bienvenidos al nuevo trimestre',
      body: `Estimadas y estimados estudiantes:

Con mucha alegría les damos la bienvenida al nuevo trimestre. Las clases inician la próxima semana en las tres sedes y ya pueden consultar el horario completo desde su perfil en la plataforma.

Les pedimos confirmar su asistencia antes del viernes. Si necesitan cambiar de horario o tienen alguna dificultad para asistir, escríbannos y buscamos una solución juntos.

Nos vemos pronto,
Equipo FundaVida`,
      filter: { kind: 'all' },
      audience: 'students',
      sentBy: 'admin',
      weeksAgo: 6,
    },
    {
      id: 'cam-2',
      subject: `Programa ${programName}: próximas sesiones`,
      body: `Familias del programa ${programName}:

Les recordamos que las sesiones de este mes continúan según el horario habitual. Cada estudiante debe traer su cuaderno de apuntes y, de ser posible, una botella de agua.

Las personas encargadas pueden acompañar a sus hijas e hijos el primer día. Aprovechamos para agradecerles el compromiso que han mostrado con la asistencia.

Cualquier consulta, con gusto la atendemos.`,
      filter: { kind: 'program', value: programId },
      audience: 'both',
      sentBy: 'admin',
      weeksAgo: 4,
    },
    {
      id: 'cam-3',
      subject: `Horario de feriados en ${province}`,
      body: `Estimadas personas encargadas:

Les compartimos el horario actualizado de feriados para la provincia de ${province}. Los días feriados no habrá lecciones y las sesiones se reponen la semana siguiente en el mismo horario.

Agradecemos revisar el calendario junto con sus hijas e hijos para que nadie se presente en un día sin clases.

Muchas gracias por su atención.`,
      filter: { kind: 'province', value: province },
      audience: 'guardians',
      sentBy: 'admin',
      weeksAgo: 2,
    },
    // Teacher-authored class message, only present when the persona owns a Course.
    ...(teacherCourse
      ? [
          {
            id: 'cam-4',
            subject: `${teacherCourse.name}: la clase de esta semana`,
            body: `Estudiantes y familias del curso ${teacherCourse.name}:

Esta semana trabajaremos en el proyecto final del módulo, así que la asistencia es especialmente importante. Quienes falten a la sesión tendrán que ponerse al día por su cuenta.

Por favor traigan los materiales que utilizamos la clase pasada. Si alguien perdió los suyos, avísenme con anticipación y los reponemos desde la sede.

Un saludo cordial.`,
            filter: { kind: 'course' as const, value: teacherCourse.id },
            audience: 'both' as const,
            sentBy: teacherId,
            weeksAgo: 1,
          },
        ]
      : []),
  ]

  return specs.map((spec) => ({
    id: spec.id,
    subject: spec.subject,
    body: spec.body,
    filter: spec.filter,
    audience: spec.audience,
    recipientIds: resolveRecipients(spec.filter, input).map((s) => s.id),
    sentAt: subWeeks(startOfDay(epoch), spec.weeksAgo).toISOString(),
    sentBy: spec.sentBy,
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

  // Pin the TCU persona to an in-progress Course so it lands on a live week
  // (ADR-0044). The unconstrained faker roll lands wherever — here it hit an
  // ended cohort, leaving tcu-1 with an empty calendar. We derive the target
  // (the teacher persona's live tue/thu cohort, plan-9) and override courseId +
  // sede *after* the selection above, so the RNG stream — and every other
  // trainee's assignment — is byte-for-byte unchanged.
  const persona = trainees.find((t) => t.id === TCU_PERSONA_ID)
  const liveTeacherCohort = courses.find(
    (c) =>
      c.teacherId === `tea-${TEACHER_PERSONA_INDEX + 1}` &&
      courseDisplayState(c, epoch) === 'inProgress' &&
      c.meetingDays.includes('tue')
  )
  if (persona && liveTeacherCohort) {
    persona.courseId = liveTeacherCohort.id
    persona.sede = liveTeacherCohort.sede
  }

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

// Notes for the top-up deviations, cycled by position so the month's milestone
// list (ADR-0048) reads like a real term's, not like a template. Spanish
// catalog-style content, never passed through t() — the same rule the Course
// names and announcement bodies follow (ADR-0021).
const CANCELLED_NOTES = [
  'Feriado',
  'Feriado nacional',
  'Cierre por mantenimiento',
  'Suspensión por lluvias',
]
const RESCHEDULED_NOTES = [
  'Aula no disponible',
  'Cambio de horario',
  'Capacitación docente',
  'Actividad institucional',
]

/** How far past a Session a reschedule may search for a free landing slot: six days. */
const RESCHEDULE_SEARCH_DAYS = 6

/**
 * The first day after `from` that this cohort never meets on and no other
 * exception of the same Course already claims — so a reschedule target can never
 * collide with another effective Session (the store's own landing guard, ADR-0039,
 * enforced here at build time). `null` when the whole search window runs past the
 * Term's end, in which case the caller cancels the Session instead of moving it.
 */
function freeRescheduleTarget(course: Course, from: Date, claimed: Set<number>): Date | null {
  // The same mapping `sessionsFor` derives Sessions with, so "never a Meeting Day"
  // here means exactly "no base Session lands there".
  const meetingDays = new Set(course.meetingDays.map(weekdayToNumber))
  const termEnd = startOfDay(new Date(course.term.end))

  for (let offset = 1; offset <= RESCHEDULE_SEARCH_DAYS; offset += 1) {
    const candidate = addDays(from, offset)
    if (candidate > termEnd) return null
    if (meetingDays.has(candidate.getDay())) continue
    if (claimed.has(candidate.getTime())) continue
    return candidate
  }
  return null
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
 * The overlay of Session deviations (ADR-0039), in two parts — deterministic
 * throughout (no faker draw), so placement itself never perturbs the RNG stream.
 *
 * The two fixed exceptions (`sxc-1`/`sxc-2`) land on the teacher persona's
 * upcoming cohort: every Session there is future, so they satisfy the store's
 * future-only + attendance-free guards and keep backing the week canvas's
 * exception rendering and its e2e.
 *
 * The top-up (ADR-0048) gives every in-progress Course one or two more, placed
 * inside the epoch's calendar month *and* within ±3 weeks of the epoch. Because
 * every persona's scope holds an in-progress Course (ADR-0044's seed guarantee),
 * every role's landing month has milestones to narrate — and, being epoch-relative,
 * the demo never decays (ADR-0002).
 */
function buildSessionExceptions(epoch: Date, courses: Course[]): SessionException[] {
  const epochDay = startOfDay(epoch)
  const exceptions: SessionException[] = []

  const demoCourse = courses.find(
    (c) =>
      c.teacherId === `tea-${TEACHER_PERSONA_INDEX + 1}` &&
      startOfDay(new Date(c.term.start)) > epochDay
  )
  if (demoCourse) {
    const sessions = sessionsFor(demoCourse)
    const toCancel = sessions[1]
    const toReschedule = sessions[3]
    if (toCancel && toReschedule) {
      // A day after the base Session: never a Meeting Day for this cohort's pattern,
      // so the reschedule target never collides with another effective Session.
      const rescheduledTo = addDays(startOfDay(new Date(toReschedule.date)), 1).toISOString()
      const createdAt = subDays(epochDay, 1).toISOString()

      exceptions.push(
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
        }
      )
    }
  }

  // The placement window: the epoch's own month, clipped to ±3 weeks around it. The
  // month bound is what makes the term map live for every persona on landing; the
  // ±3-week bound keeps the deviations near "now" instead of at a month's far edge.
  // In-progress Terms straddle the epoch by at least two weeks either side, so this
  // window always holds several of each live cohort's Sessions.
  const windowStart = maxDate([subWeeks(epochDay, 3), startOfMonth(epochDay)])
  const windowEnd = minDate([addWeeks(epochDay, 3), endOfMonth(epochDay)])

  let seq = exceptions.length

  courses
    .filter((course) => courseDisplayState(course, epoch) === 'inProgress')
    .forEach((course, courseIndex) => {
      const candidates = sessionsFor(course).filter((session) => {
        const day = startOfDay(new Date(session.date))
        return day >= windowStart && day <= windowEnd
      })
      if (candidates.length === 0) return

      // Two exceptions on every other live cohort, one on the rest — spread across
      // the window (at its thirds) so a month never shows them piled on one week.
      const wanted = courseIndex % 2 === 0 ? 2 : 1
      const picked = new Set<number>()
      for (let i = 1; i <= wanted; i += 1) {
        picked.add(Math.floor((candidates.length * i) / (wanted + 1)))
      }

      // Every day this Course has already spoken for: a moved Session must not land
      // on another exception's target.
      const claimed = new Set<number>()

      Array.from(picked).forEach((index, i) => {
        const session = candidates[index]
        if (!session) return
        const sessionDay = startOfDay(new Date(session.date))

        // A deviation is announced ahead of the class it changes, and never in the
        // future: three days before the Session, or the day before the epoch for a
        // Session still to come.
        const announced = subDays(sessionDay, 3)
        const yesterday = subDays(epochDay, 1)
        const createdAt = (announced < yesterday ? announced : yesterday).toISOString()

        // Alternate the type by position so the seeded month mixes both kinds.
        const wantsReschedule = (courseIndex + i) % 2 === 1
        const target = wantsReschedule ? freeRescheduleTarget(course, sessionDay, claimed) : null
        const noteIndex = courseIndex + i
        seq += 1

        if (target) {
          claimed.add(target.getTime())
          exceptions.push({
            id: `sxc-${seq}`,
            courseId: course.id,
            type: 'rescheduled',
            date: session.date,
            newDate: target.toISOString(),
            note: RESCHEDULED_NOTES[noteIndex % RESCHEDULED_NOTES.length] as string,
            createdAt,
          })
          return
        }

        // No free landing slot inside the Term (the cohort meets on every following
        // day the search reaches, or the Term ends first) — the class is cancelled,
        // which needs no target at all.
        exceptions.push({
          id: `sxc-${seq}`,
          courseId: course.id,
          type: 'cancelled',
          date: session.date,
          note: CANCELLED_NOTES[noteIndex % CANCELLED_NOTES.length] as string,
          createdAt,
        })
      })
    })

  return exceptions
}

// A couple of manual announcements per live cohort so no feed is empty on first
// load (ADR-0040). Only `inProgress` Courses get them — a startsSoon cohort has no
// class yet and an ended/closed one is history. Bodies are Spanish catalog-style
// content (like Course descriptions, never passed through t()); createdAt is
// staggered within the past week so the newest-first feed has a natural order.
// Runs after every faker draw with a fixed body pool (no RNG), so the seed's
// counts and stream are unshifted.
const ANNOUNCEMENT_BODIES = [
  'Recuerden traer su cuaderno de trabajo a la próxima sesión.',
  'Excelente participación esta semana. ¡Sigamos así!',
  'Repasaremos los temas de la última clase antes de continuar.',
]

function buildAnnouncements(epoch: Date, courses: Course[]): Announcement[] {
  const epochDay = startOfDay(epoch)
  const announcements: Announcement[] = []
  let seq = 1

  courses
    .filter((course) => courseDisplayState(course, epoch) === 'inProgress')
    .forEach((course) => {
      // Two posts per live Course, dated 5 and 2 days ago (both within the Term,
      // never future). The body pool cycles by Course index so adjacent cohorts
      // don't read identically.
      const bodies = [
        ANNOUNCEMENT_BODIES[seq % ANNOUNCEMENT_BODIES.length] ?? ANNOUNCEMENT_BODIES[0],
        ANNOUNCEMENT_BODIES[(seq + 1) % ANNOUNCEMENT_BODIES.length] ?? ANNOUNCEMENT_BODIES[1],
      ]
      ;[5, 2].forEach((daysAgo, i) => {
        announcements.push({
          id: `ann-${seq}`,
          courseId: course.id,
          body: bodies[i] as string,
          kind: 'manual',
          createdAt: subDays(epochDay, daysAgo).toISOString(),
        })
        seq += 1
      })
    })

  return announcements
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

  // The Session overlay is deterministic and reads only the Courses, so it is built
  // before attendance and passed in: a cancelled class carries no attendance, and a
  // rescheduled one carries its attendance to the day it actually met (ADR-0039).
  // Placing it here draws nothing from faker, so the RNG stream is unmoved by the
  // reorder itself.
  const sessionExceptions = buildSessionExceptions(epoch, courses)
  const attendance = buildAttendance(epoch, enrollments, courses, sessionExceptions)

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
    sessionExceptions,
    announcements: buildAnnouncements(epoch, courses),
    auditLog,
    emailCampaigns,
  }
}
