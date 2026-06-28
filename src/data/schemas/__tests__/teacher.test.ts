import { describe, it, expect } from 'vitest'
import { buildTeacherSchema } from '../teacher'

const tStub = ((k: string) => k) as unknown as Parameters<typeof buildTeacherSchema>[0]
const teacherSchema = buildTeacherSchema(tStub)

describe('teacherSchema', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@fv.cr',
    sede: 'Alajuelita',
    province: 'Cartago',
    canton: 'Paraíso',
  }

  it('accepts a valid payload', () => {
    expect(() => teacherSchema.parse(valid)).not.toThrow()
  })

  it('rejects an empty province', () => {
    expect(() => teacherSchema.parse({ ...valid, province: '' })).toThrow()
  })

  it('rejects an empty canton', () => {
    expect(() => teacherSchema.parse({ ...valid, canton: '' })).toThrow()
  })

  it('rejects missing first name', () => {
    expect(() => teacherSchema.parse({ ...valid, firstName: '' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => teacherSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects an unknown sede', () => {
    expect(() => teacherSchema.parse({ ...valid, sede: 'San José HQ' })).toThrow()
  })
})
