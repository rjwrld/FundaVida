import { describe, it, expect, beforeEach } from 'vitest'
import i18next from 'i18next'
import '@/lib/i18n'
import { useStore } from '@/data/store'
import enJson from '@/locales/en.json'
import { AUDIT_ACTION_VARIANT } from '@/lib/statusVariant'
import type { AuditAction, AuditEntity } from '@/types'

describe('i18n', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('loads English as the default', async () => {
    await i18next.changeLanguage('en')
    expect(i18next.t('landing.hero.headline')).toBe('Hope changes everything.')
    expect(i18next.t('nav.students')).toBe('Students')
  })

  it('switches to Spanish when changeLanguage is called', async () => {
    await i18next.changeLanguage('es')
    expect(i18next.t('nav.students')).toBe('Estudiantes')
  })

  it('falls back to English when a key is missing in Spanish', async () => {
    i18next.addResource('es', 'translation', 'temp.onlyInEnglish', '')
    i18next.addResource('en', 'translation', 'temp.onlyInEnglish', 'English Only')
    try {
      await i18next.changeLanguage('es')
      expect(i18next.t('temp.onlyInEnglish')).toBe('English Only')
    } finally {
      i18next.removeResourceBundle('en', 'translation')
      i18next.addResourceBundle('en', 'translation', enJson, true, true)
    }
  })

  it('returns the raw key when absent from both locales', async () => {
    await i18next.changeLanguage('es')
    expect(i18next.t('does.not.exist.anywhere')).toBe('does.not.exist.anywhere')
  })

  // The audit badge and its entity column resolve their labels dynamically, so a
  // missing key is not a typecheck error — it silently renders as the raw string
  // `auditLog.actions.close` (#345). These Records are the exhaustiveness seam:
  // widening either enum fails to compile here before it can ship a raw key.
  const ALL_ENTITIES: Record<AuditEntity, true> = {
    student: true,
    teacher: true,
    course: true,
    enrollment: true,
    grade: true,
    certificate: true,
    attendance: true,
    emailCampaign: true,
    tcuActivity: true,
    session: true,
    announcement: true,
  }

  describe.each(['en', 'es'])('audit log labels (%s)', (locale) => {
    it.each(Object.keys(AUDIT_ACTION_VARIANT) as AuditAction[])(
      'renders a real label for the %s action, not the raw key',
      async (action) => {
        await i18next.changeLanguage(locale)
        const key = `auditLog.actions.${action}`
        const label = i18next.t(key)
        expect(label).not.toBe(key)
        expect(label.trim()).not.toBe('')
      }
    )

    it.each(Object.keys(ALL_ENTITIES) as AuditEntity[])(
      'renders a real label for the %s entity, not the raw key',
      async (entity) => {
        await i18next.changeLanguage(locale)
        const key = `auditLog.entities.${entity}`
        const label = i18next.t(key)
        expect(label).not.toBe(key)
        expect(label.trim()).not.toBe('')
      }
    )
  })
})
