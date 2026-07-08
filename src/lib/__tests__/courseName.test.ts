import { describe, it, expect } from 'vitest'
import { calendarCardName, shortCourseName } from '../courseName'

describe('shortCourseName', () => {
  it('drops the "— {Sede}" segment from a seeded name', () => {
    expect(
      shortCourseName({
        name: 'Alfabetización Primaria — Linda Vista (ene 2026)',
        sede: 'Linda Vista',
      })
    ).toBe('Alfabetización Primaria (ene 2026)')
  })

  it('leaves a name without a "— {Sede}" segment unchanged', () => {
    expect(shortCourseName({ name: 'Advanced Mathematics', sede: 'Hatillo' })).toBe(
      'Advanced Mathematics'
    )
  })

  it('only strips its own Sede, not a coincidental substring', () => {
    expect(
      shortCourseName({ name: 'Música Secundaria — Hatillo (jul 2026)', sede: 'Hatillo' })
    ).toBe('Música Secundaria (jul 2026)')
  })
})

describe('calendarCardName', () => {
  it('drops both the "— {Sede}" segment and the "({mon yyyy})" cohort suffix', () => {
    expect(
      calendarCardName({
        name: 'Alfabetización Primaria — Linda Vista (ene 2026)',
        sede: 'Linda Vista',
      })
    ).toBe('Alfabetización Primaria')
  })

  it('drops the cohort suffix even when the name carries no Sede segment', () => {
    expect(calendarCardName({ name: 'Computación Primaria (jul 2026)', sede: 'Hatillo' })).toBe(
      'Computación Primaria'
    )
  })

  it('leaves a plain teacher-authored name unchanged', () => {
    expect(calendarCardName({ name: 'Advanced Mathematics', sede: 'Hatillo' })).toBe(
      'Advanced Mathematics'
    )
  })
})
