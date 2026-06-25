import { describe, it, expect } from 'vitest'
import { PASSING_SCORE, isPassingScore, isCertificateDownloadable } from '../certificates'
import type { Certificate } from '@/types'

function makeCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: 'cert-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    score: 90,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('isPassingScore', () => {
  it('is true at or above the passing score', () => {
    expect(isPassingScore(PASSING_SCORE)).toBe(true)
    expect(isPassingScore(PASSING_SCORE + 5)).toBe(true)
  })

  it('is false below the passing score', () => {
    expect(isPassingScore(PASSING_SCORE - 1)).toBe(false)
  })
})

describe('isCertificateDownloadable', () => {
  it('is downloadable only once approved', () => {
    expect(isCertificateDownloadable(makeCertificate({ status: 'approved' }))).toBe(true)
  })

  it('is not downloadable while pending', () => {
    expect(isCertificateDownloadable(makeCertificate({ status: 'pending' }))).toBe(false)
  })
})
