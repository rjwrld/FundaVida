import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { Suspense, useEffect, type ReactNode } from 'react'
import en from '@/locales/en.json'
import es from '@/locales/es.json'
import { useStore } from '@/data/store'

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: useStore.getState().locale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (_lngs, _ns, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] missing key: ${key}`)
    }
  },
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useStore((s) => s.locale)

  useEffect(() => {
    if (i18next.language !== locale) {
      void i18next.changeLanguage(locale)
    }
  }, [locale])

  return (
    <I18nextProvider i18n={i18next}>
      <Suspense fallback={null}>{children}</Suspense>
    </I18nextProvider>
  )
}
