import { describe, it, expect } from 'vitest'
import { buildTeacherSchema } from '../teacher'

const tStub = ((k: string) => k) as unknown as Parameters<typeof buildTeacherSchema>[0]
const teacherSchema = buildTeacherSchema(tStub)

describe('teacherSchema', () => {
  it('accepts a valid payload', () => {
    expect(() =>
      teacherSchema.parse({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@fv.cr' })
    ).not.toThrow()
  })

  it('rejects missing first name', () => {
    expect(() => teacherSchema.parse({ firstName: '', lastName: 'X', email: 'a@b.co' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() =>
      teacherSchema.parse({ firstName: 'A', lastName: 'B', email: 'not-an-email' })
    ).toThrow()
  })
})
