import { describe, it, expect } from 'vitest'
import { studentSchema } from '../student'

describe('studentSchema', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    gender: 'F' as const,
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'University' as const,
  }

  it('accepts a valid student', () => {
    expect(studentSchema.parse(valid)).toEqual(valid)
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
