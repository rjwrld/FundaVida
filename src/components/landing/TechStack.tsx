import { useTranslation } from 'react-i18next'

const BADGES = [
  'React 18',
  'TypeScript',
  'Vite',
  'Tailwind',
  'shadcn/ui',
  'Zustand',
  'React Query',
  'React Hook Form',
  'Zod',
  'Playwright',
  'Vitest',
  'react-i18next',
]

export function TechStack() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="tech-stack-heading" className="space-y-4">
      <h2
        id="tech-stack-heading"
        className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground"
      >
        {t('landing.techStack.heading')}
      </h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {BADGES.map((label) => (
          <li
            key={label}
            className="rounded-md border bg-background px-2.5 py-1 font-mono text-xs text-foreground"
          >
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}
