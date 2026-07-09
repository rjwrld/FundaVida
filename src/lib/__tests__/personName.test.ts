import { describe, it, expect } from 'vitest'
import type { Student, Teacher, TcuTrainee } from '@/types'
import { fullName } from '../personName'

describe('fullName', () => {
  it('joins the given name and the first surname with a single space', () => {
    expect(fullName({ firstName: 'María José', lastName: 'Vargas' })).toBe('María José Vargas')
  })

  it('reads the same pair off a Student, a Teacher and a TcuTrainee', () => {
    const student: Pick<Student, 'firstName' | 'lastName'> = {
      firstName: 'Ana',
      lastName: 'Quesada',
    }
    const teacher: Pick<Teacher, 'firstName' | 'lastName'> = {
      firstName: 'Ana',
      lastName: 'Quesada',
    }
    const trainee: Pick<TcuTrainee, 'firstName' | 'lastName'> = {
      firstName: 'Ana',
      lastName: 'Quesada',
    }

    expect(fullName(student)).toBe('Ana Quesada')
    expect(fullName(teacher)).toBe(fullName(student))
    expect(fullName(trainee)).toBe(fullName(student))
  })

  it('does not reorder or abbreviate — the surname never leads', () => {
    expect(fullName({ firstName: 'Carlos', lastName: 'Mora' })).not.toBe('Mora, Carlos')
    expect(fullName({ firstName: 'Carlos', lastName: 'Mora' })).not.toBe('C. Mora')
  })
})
