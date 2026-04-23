import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatNumber, formatPercent, formatGrade } from '../format'

describe('format', () => {
  describe('formatDate', () => {
    it('renders English short date', () => {
      expect(formatDate('2026-04-22T10:00:00Z', 'en')).toMatch(/Apr/)
      expect(formatDate('2026-04-22T10:00:00Z', 'en')).toMatch(/22/)
      expect(formatDate('2026-04-22T10:00:00Z', 'en')).toMatch(/2026/)
    })

    it('renders Spanish short date with localized month', () => {
      const result = formatDate('2026-04-22T10:00:00Z', 'es')
      expect(result.toLowerCase()).toContain('abr')
      expect(result).toContain('22')
      expect(result).toContain('2026')
    })
  })

  describe('formatDateTime', () => {
    it('includes hour and minute', () => {
      const result = formatDateTime('2026-04-22T10:05:00Z', 'en')
      expect(result).toMatch(/\d{2}:\d{2}/)
    })
  })

  describe('formatNumber', () => {
    it('uses comma grouping in English', () => {
      expect(formatNumber(12345, 'en')).toBe('12,345')
    })

    it('uses period grouping in Spanish (CR)', () => {
      expect(formatNumber(12345, 'es')).toMatch(/12[.\s]345/)
    })
  })

  describe('formatPercent', () => {
    it('renders 0.756 as 75.6% in English', () => {
      expect(formatPercent(0.756, 'en')).toBe('75.6%')
    })

    it('renders 0.756 as 75,6% in Spanish', () => {
      expect(formatPercent(0.756, 'es')).toMatch(/75,6\s*%/)
    })
  })

  describe('formatGrade', () => {
    it('renders 87 as 87.0 in English', () => {
      expect(formatGrade(87, 'en')).toBe('87.0')
    })

    it('renders 87 as 87,0 in Spanish', () => {
      expect(formatGrade(87, 'es')).toBe('87,0')
    })
  })
})
