import { describe, it, expect } from 'vitest'
import { buildStudentSchema } from '../student'

const tStub = ((k: string) => k) as unknown as Parameters<typeof buildStudentSchema>[0]
const studentSchema = buildStudentSchema(tStub)

describe('studentSchema', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    gender: 'F' as const,
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'secundaria' as const,
    sede: 'Hatillo' as const,
  }

  it('accepts a valid student', () => {
    expect(studentSchema.parse(valid)).toEqual(valid)
  })

  it('rejects an unknown sede', () => {
    expect(() => studentSchema.parse({ ...valid, sede: 'Heredia HQ' as never })).toThrow()
  })

  it('rejects University — the foundation serves through secondary only', () => {
    expect(() =>
      studentSchema.parse({ ...valid, educationalLevel: 'University' as never })
    ).toThrow()
  })

  it('rejects empty names', () => {
    expect(() => studentSchema.parse({ ...valid, firstName: '' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => studentSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects unknown educational levels', () => {
    expect(() => studentSchema.parse({ ...valid, educationalLevel: 'Unknown' as never })).toThrow()
  })
})
