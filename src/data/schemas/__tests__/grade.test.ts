import { describe, it, expect } from 'vitest'
import { buildGradeSchema } from '../grade'

const tStub = ((k: string) => k) as unknown as Parameters<typeof buildGradeSchema>[0]
const gradeSchema = buildGradeSchema(tStub)

describe('gradeSchema', () => {
  it('accepts scores 0 and 100', () => {
    expect(gradeSchema.parse({ score: 0 }).score).toBe(0)
    expect(gradeSchema.parse({ score: 100 }).score).toBe(100)
  })

  it('rejects negative', () => {
    expect(() => gradeSchema.parse({ score: -1 })).toThrow()
  })

  it('rejects over 100', () => {
    expect(() => gradeSchema.parse({ score: 101 })).toThrow()
  })

  it('rejects non-number', () => {
    expect(() => gradeSchema.parse({ score: 'abc' as never })).toThrow()
  })
})
