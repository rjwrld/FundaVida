import { describe, it, expect, beforeEach } from 'vitest'
import { writeSetInvalidations, SLICE_TO_KEYS, type StoreSliceName } from '../invalidation'
import { useStore, type StoreState } from '@/data/store'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '@/data/persistence'

const SLICES = Object.keys(SLICE_TO_KEYS) as StoreSliceName[]

type SliceRecord = Record<StoreSliceName, unknown[]>

// A snapshot where every data slice is a distinct empty array; giving a slice a
// fresh array in `after` simulates a mutation that wrote (only) that slice.
function baseState(): SliceRecord {
  const state = {} as SliceRecord
  for (const slice of SLICES) state[slice] = []
  return state
}

// Build a (before, after) pair whose only reference differences are `written`.
function writePair(written: StoreSliceName[]): { before: StoreState; after: StoreState } {
  const before = baseState()
  const after = baseState()
  for (const slice of SLICES) {
    after[slice] = written.includes(slice) ? [] : before[slice]
  }
  return { before: before as unknown as StoreState, after: after as unknown as StoreState }
}

describe('writeSetInvalidations', () => {
  it('returns nothing when no slice changed', () => {
    const { before, after } = writePair([])
    expect(writeSetInvalidations(before, after)).toEqual([])
  })

  // Table-driven: each written slice → the exact key prefixes it invalidates.
  const cases: { name: string; written: StoreSliceName; expected: string[][] }[] = [
    { name: 'students (identity)', written: 'students', expected: [['students']] },
    { name: 'courses (identity)', written: 'courses', expected: [['courses']] },
    { name: 'programs (identity)', written: 'programs', expected: [['programs']] },
    { name: 'grades (identity)', written: 'grades', expected: [['grades']] },
    { name: 'certificates (identity)', written: 'certificates', expected: [['certificates']] },
    { name: 'attendance (identity)', written: 'attendance', expected: [['attendance']] },
    { name: 'teachers (identity)', written: 'teachers', expected: [['teachers']] },
    {
      name: 'emailCampaigns (identity)',
      written: 'emailCampaigns',
      expected: [['emailCampaigns']],
    },
    // Documented edges.
    {
      name: 'enrollments → +courses (seats/browse derive from enrollments)',
      written: 'enrollments',
      expected: [['enrollments'], ['courses']],
    },
    {
      name: 'tcuActivities → tcu + trainees (name mismatch + hour rollups)',
      written: 'tcuActivities',
      expected: [['tcu'], ['trainees']],
    },
    {
      name: 'tcuTrainees → trainees (name mismatch)',
      written: 'tcuTrainees',
      expected: [['trainees']],
    },
    // auditLog is an ordinary slice — always in the diff for a withAudit mutation.
    { name: 'auditLog (always, via withAudit)', written: 'auditLog', expected: [['auditLog']] },
  ]

  for (const { name, written, expected } of cases) {
    it(`maps ${name}`, () => {
      const { before, after } = writePair([written])
      expect(writeSetInvalidations(before, after)).toEqual(expected)
    })
  }

  it('dedupes when two written slices share a key (enrollments + courses → courses once)', () => {
    const { before, after } = writePair(['enrollments', 'courses'])
    // Iterated in SLICE_TO_KEYS order (courses before enrollments); courses'
    // identity key wins the first emit, so enrollments' edge does not repeat it.
    expect(writeSetInvalidations(before, after)).toEqual([['courses'], ['enrollments']])
  })

  it('unions the keys of every written slice', () => {
    const { before, after } = writePair(['enrollments', 'auditLog'])
    expect(writeSetInvalidations(before, after)).toEqual([
      ['enrollments'],
      ['courses'],
      ['auditLog'],
    ])
  })
})

// The two regressions the derivation exists to prevent — exercised against the
// real store so they guard the live wiring, not a hand-built diff (ADR-0029).
describe('writeSetInvalidations — named regressions', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('unenroll invalidates certificates (the useDeleteEnrollment divergence)', () => {
    const enrollment = useStore.getState().enrollments[0]
    if (!enrollment) throw new Error('expected a seeded enrollment')
    const before = useStore.getState()
    useStore.getState().unenrollStudent(enrollment.id)
    const after = useStore.getState()

    const keys = writeSetInvalidations(before, after)
    // The old hand-list on useDeleteEnrollment omitted ['certificates'] while
    // unenrollStudent revokes them; the write-set diff cannot miss it.
    expect(keys).toContainEqual(['certificates'])
    expect(keys).toContainEqual(['enrollments'])
    expect(keys).toContainEqual(['auditLog'])
  })

  it('enroll invalidates courses so the roster refetches (#87)', () => {
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected a seeded course')
    const enrolled = new Set(
      useStore
        .getState()
        .enrollments.filter((e) => e.courseId === course.id)
        .map((e) => e.studentId)
    )
    const student = useStore
      .getState()
      .students.find(
        (s) => s.sede === course.sede && s.educationalLevel === course.level && !enrolled.has(s.id)
      )
    if (!student) throw new Error('expected an unenrolled same-Sede, same-level student')

    const before = useStore.getState()
    useStore.getState().enrollStudent(student.id, course.id)
    const after = useStore.getState()

    const keys = writeSetInvalidations(before, after)
    // #87: the Course detail roster reads a scoped query under ['courses']; the
    // enrollments→courses edge refetches it after an enroll.
    expect(keys).toContainEqual(['courses'])
    expect(keys).toContainEqual(['enrollments'])
  })
})
