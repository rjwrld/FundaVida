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
    guardian: {
      name: 'María Lovelace',
      relationship: 'madre' as const,
      phone: '8888-8888',
      email: 'maria.lovelace@gmail.com',
    },
  }

  it('accepts a valid student', () => {
    expect(studentSchema.parse(valid)).toEqual(valid)
  })

  it('rejects an empty encargado name', () => {
    expect(() =>
      studentSchema.parse({ ...valid, guardian: { ...valid.guardian, name: '' } })
    ).toThrow()
  })

  it('rejects an unknown encargado relationship', () => {
    expect(() =>
      studentSchema.parse({
        ...valid,
        guardian: { ...valid.guardian, relationship: 'cousin' as never },
      })
    ).toThrow()
  })

  it('rejects a phone that is not a Costa Rican mobile (8888-8888)', () => {
    expect(() =>
      studentSchema.parse({ ...valid, guardian: { ...valid.guardian, phone: '12345' } })
    ).toThrow()
  })

  it('rejects an invalid encargado email', () => {
    expect(() =>
      studentSchema.parse({ ...valid, guardian: { ...valid.guardian, email: 'nope' } })
    ).toThrow()
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
