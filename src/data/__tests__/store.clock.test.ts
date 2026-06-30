import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { clock, setDemoEpoch } from '@/lib/clock'

describe('store ↔ clock seam (ADR-0014)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('resetDemo re-anchors demoEpoch to real now and zeroes the offset', () => {
    const before = Date.now()
    useStore.getState().resetDemo()
    const after = Date.now()

    const { demoEpoch, offset } = useStore.getState()
    expect(offset).toBe(0)
    const epochMs = new Date(demoEpoch).getTime()
    expect(epochMs).toBeGreaterThanOrEqual(before)
    expect(epochMs).toBeLessThanOrEqual(after)
  })

  it('hydrates the clock so clock.now() reads the store epoch after reset', () => {
    useStore.getState().resetDemo()
    expect(clock.now().toISOString()).toBe(useStore.getState().demoEpoch)
  })
})

describe('store writes stamp timestamps from the clock, not wall-time (ADR-0014)', () => {
  // A Demo Epoch far in the future, so a write timestamp drawn from the clock is
  // distinguishable from a live new Date().
  const FROZEN = new Date('2099-01-01T00:00:00.000Z')
  const FROZEN_ISO = FROZEN.toISOString()

  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    // Seed against real wall-time, then override the clock to the frozen instant
    // so any new write must read clock.now() to land on FROZEN.
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    setDemoEpoch(FROZEN)
  })

  function lindaVistaCourseId(): string {
    // A published Linda Vista course, so it can be both graded and closed (closing
    // requires a published cohort, ADR-0024).
    const course = useStore
      .getState()
      .courses.find((c) => c.sede === 'Linda Vista' && c.status === 'published')
    if (!course) throw new Error('seed: no published Linda Vista course')
    return course.id
  }

  function newStudentId(): string {
    return useStore.getState().createStudent({
      firstName: 'Frozen',
      lastName: 'Clock',
      email: 'frozen@test.com',
      gender: 'F',
      sede: 'Linda Vista',
      province: 'San José',
      canton: 'Central',
      educationalLevel: 'primaria',
      guardian: {
        name: 'Encargado Test',
        relationship: 'madre',
        phone: '8888-8888',
        email: 'enc@example.com',
      },
    }).id
  }

  it('stamps entity createdAt and the audit timestamp from clock.now()', () => {
    const student = useStore.getState().createStudent({
      firstName: 'Frozen',
      lastName: 'Clock',
      email: 'frozen2@test.com',
      gender: 'M',
      sede: 'Linda Vista',
      province: 'San José',
      canton: 'Central',
      educationalLevel: 'secundaria',
      guardian: {
        name: 'Encargado Test',
        relationship: 'madre',
        phone: '8888-8888',
        email: 'enc@example.com',
      },
    })
    expect(student.createdAt).toBe(FROZEN_ISO)
    expect(useStore.getState().auditLog[0]?.timestamp).toBe(FROZEN_ISO)
  })

  it('stamps enrolledAt from clock.now()', () => {
    const enrollment = useStore.getState().enrollStudent(newStudentId(), lindaVistaCourseId())
    expect(enrollment.enrolledAt).toBe(FROZEN_ISO)
  })

  it('stamps grade issuedAt from clock.now()', () => {
    const studentId = newStudentId()
    const courseId = lindaVistaCourseId()
    useStore.getState().enrollStudent(studentId, courseId)
    const grade = useStore.getState().setGrade(studentId, courseId, 95)
    expect(grade.issuedAt).toBe(FROZEN_ISO)
  })

  it('stamps the emitted certificate issuedAt from clock.now() on close', () => {
    const studentId = newStudentId()
    const courseId = lindaVistaCourseId()
    useStore.getState().enrollStudent(studentId, courseId)
    useStore.getState().setGrade(studentId, courseId, 95)
    useStore.getState().closeCourse(courseId)
    const cert = useStore
      .getState()
      .certificates.find((c) => c.studentId === studentId && c.courseId === courseId)
    if (!cert) throw new Error('expected a certificate emitted by closing the course')
    expect(cert.issuedAt).toBe(FROZEN_ISO)
  })

  it('stamps email campaign sentAt from clock.now()', () => {
    const campaign = useStore.getState().sendEmailCampaign({
      subject: 'Hello',
      body: 'Body',
      filter: { kind: 'all' },
      recipientIds: [],
    })
    expect(campaign.sentAt).toBe(FROZEN_ISO)
  })
})
