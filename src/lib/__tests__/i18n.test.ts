import { describe, it, expect, beforeEach } from 'vitest'
import i18next from 'i18next'
import '@/lib/i18n'
import { useStore } from '@/data/store'

describe('i18n', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('loads English as the default', async () => {
    await i18next.changeLanguage('en')
    expect(i18next.t('landing.title')).toBe('FundaVida')
    expect(i18next.t('nav.students')).toBe('Students')
  })

  it('switches to Spanish when changeLanguage is called', async () => {
    await i18next.changeLanguage('es')
    expect(i18next.t('nav.students')).toBe('Estudiantes')
  })

  it('falls back to English when a key is missing in Spanish', async () => {
    i18next.addResource('es', 'translation', 'temp.onlyInEnglish', '')
    i18next.addResource('en', 'translation', 'temp.onlyInEnglish', 'English Only')
    await i18next.changeLanguage('es')
    expect(i18next.t('temp.onlyInEnglish')).toBe('English Only')
  })

  it('returns the raw key when absent from both locales', async () => {
    await i18next.changeLanguage('es')
    expect(i18next.t('does.not.exist.anywhere')).toBe('does.not.exist.anywhere')
  })
})
