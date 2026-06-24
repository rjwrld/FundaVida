import { describe, it, expect } from 'vitest'
import { buildCourseSchema } from '../course'

const tStub = ((k: string) => k) as unknown as Parameters<typeof buildCourseSchema>[0]
const courseSchema = buildCourseSchema(tStub)

describe('courseSchema', () => {
  const valid = {
    name: 'Literacy 101',
    description: 'Intro to literacy skills',
    sede: 'Linda Vista',
    programName: 'Literacy',
    teacherId: 'tea-1',
    termStart: '2026-06-15',
    termEnd: '2026-08-15',
    meetingDays: ['mon', 'wed'],
  }

  it('accepts a valid course', () => {
    const parsed = courseSchema.parse(valid)
    expect(parsed.name).toBe(valid.name)
    expect(parsed.sede).toBe(valid.sede)
    expect(parsed.termStart).toBe(valid.termStart)
    expect(parsed.meetingDays).toEqual(valid.meetingDays)
  })

  it('rejects an unknown sede', () => {
    expect(() => courseSchema.parse({ ...valid, sede: 'San José HQ' })).toThrow()
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

  it('rejects term end before term start', () => {
    expect(() =>
      courseSchema.parse({ ...valid, termStart: '2026-08-15', termEnd: '2026-06-15' })
    ).toThrow()
  })

  it('rejects empty meeting days', () => {
    expect(() => courseSchema.parse({ ...valid, meetingDays: [] })).toThrow()
  })
})
