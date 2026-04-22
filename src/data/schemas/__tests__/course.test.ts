import { describe, it, expect } from 'vitest'
import { courseSchema } from '../course'

describe('courseSchema', () => {
  const valid = {
    name: 'Literacy 101',
    description: 'Intro to literacy skills',
    headquartersName: 'San José HQ',
    programName: 'Literacy',
    teacherId: 'tea-1',
  }

  it('accepts a valid course', () => {
    expect(courseSchema.parse(valid)).toEqual(valid)
  })

  it('rejects empty name', () => {
    expect(() => courseSchema.parse({ ...valid, name: '' })).toThrow()
  })

  it('rejects empty description', () => {
    expect(() => courseSchema.parse({ ...valid, description: '' })).toThrow()
  })

  it('rejects missing teacher', () => {
    expect(() => courseSchema.parse({ ...valid, teacherId: '' })).toThrow()
  })
})
