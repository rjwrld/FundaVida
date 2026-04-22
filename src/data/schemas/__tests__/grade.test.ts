import { describe, it, expect } from 'vitest'
import { gradeSchema } from '../grade'

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
