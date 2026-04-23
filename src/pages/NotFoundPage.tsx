import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('notFound.subtitle')}</p>
      <Link to="/" className="mt-6 inline-block underline">
        {t('common.actions.backToHome')}
      </Link>
    </div>
  )
}
