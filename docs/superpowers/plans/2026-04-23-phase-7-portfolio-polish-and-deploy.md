# Phase 7 — Portfolio Polish and Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FundaVida LinkedIn-shareable. Polish the landing page, auto-generate bilingual screenshots, rewrite the README, wire Vercel deploy, and add a Lighthouse CI soft gate.

**Architecture:** Five new landing-page sections (hero / role cards / feature preview / tech stack / footer) built with existing shadcn primitives. A Playwright-driven `scripts/screenshots.ts` captures 8 PNGs (6 flows × 2 locales + hero + OG) committed to `public/screenshots/`. README fully rewritten in English with a collapsed ES `<details>` block preserving the old README's warmth. Vercel project linked via CLI (default `.vercel.app` subdomain). Lighthouse CI via `treosh/lighthouse-ci-action@v12` with soft thresholds (Perf ≥ 90; A11y/BP/SEO ≥ 95).

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Tailwind · shadcn/ui · react-i18next · Zustand · @tanstack/react-query · Playwright · Vitest · **tsx · Vercel · Vercel Analytics · GitHub Actions · treosh/lighthouse-ci-action**.

**Spec:** `docs/superpowers/specs/2026-04-23-phase-7-portfolio-polish-and-deploy-design.md`.

**Phase output:**

- A recruiter lands on `https://<project>.vercel.app`, sees a polished hero with a product screenshot, scrolls through role cards + feature previews + tech stack + footer — all bilingual.
- The README loads on GitHub with the live-demo badge at the top, a rearchitecture callout, embedded screenshots (including an EN/ES pair), and a collapsed Spanish section at the bottom.
- Pasting the Vercel URL into LinkedIn/Slack/Twitter renders a rich preview card.
- Every PR shows a Lighthouse job with scores posted as a comment; failures turn the check red but don't block merge.
- Repo ends Phase 7 at 42-44 merged PRs on `main`, all conventional-commit, all green CI.

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off a fresh `main`.
- **Never** `Co-Authored-By: Claude` trailers. **Never** "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces this; sentence-case blocked).

---

## File Structure

### New files (Task 1)

| Path                                                       | Purpose                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/components/landing/HeroScreenshot.tsx`                | Renders the hero `<img>` with responsive classes and `alt` text from `t()`                        |
| `src/components/landing/FeaturePreview.tsx`                | Three-card preview grid driven by a `features` constant (data-driven, not three hand-coded cards) |
| `src/components/landing/TechStack.tsx`                     | Static text badge row (spans with border + monospace; no runtime SVG fetch)                       |
| `src/components/landing/LandingFooter.tsx`                 | Footer with FundaVida org link + LinkedIn + GitHub repo + rearchitected tagline                   |
| `src/components/landing/__tests__/FeaturePreview.test.tsx` | Vitest smoke — renders three cards, all captions come from the dictionary                         |
| `src/components/landing/__tests__/LandingFooter.test.tsx`  | Vitest smoke — external links have `target="_blank" rel="noopener noreferrer"`                    |
| `src/constants/landingFeatures.ts`                         | Exports `LANDING_FEATURES: { titleKey, captionKey, image, alt }[]` array used by `FeaturePreview` |

### New files (Task 2)

| Path                                    | Purpose                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `scripts/screenshots.ts`                | Plain TS script using `@playwright/test`'s `chromium` API; run via `tsx` |
| `public/screenshots/hero.en.png`        | 1440×900 admin dashboard hero                                            |
| `public/screenshots/students.en.png`    | 1440×900 students list in EN                                             |
| `public/screenshots/students.es.png`    | 1440×900 students list in ES                                             |
| `public/screenshots/certificate.en.png` | 1200×800 certificate preview dialog in EN                                |
| `public/screenshots/certificate.es.png` | 1200×800 certificate preview dialog in ES                                |
| `public/screenshots/reports.en.png`     | 1440×900 reports dashboard in EN                                         |
| `public/screenshots/reports.es.png`     | 1440×900 reports dashboard in ES                                         |
| `public/og-image.png`                   | 1200×630 social preview card                                             |

### New files (Task 5)

| Path                               | Purpose                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `.github/workflows/lighthouse.yml` | Runs LHCI against Vercel preview on every PR                                |
| `.github/lighthouse-budget.json`   | LHCI assertions: Perf ≥ 0.9, A11y ≥ 0.95, Best Practices ≥ 0.95, SEO ≥ 0.95 |

### Modified files (across all tasks)

| File                                       | Change                                                                                                 | Task |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---- |
| `src/pages/LandingPage.tsx`                | Mount `HeroScreenshot`, `FeaturePreview`, `TechStack`, `LandingFooter`; wire landing-hero copy         | 1    |
| `src/locales/en.json`                      | Add `landing.hero.*`, `landing.featurePreview.*`, `landing.techStack.*`, `landing.footer.*` (~15 keys) | 1    |
| `src/locales/es.json`                      | Same keys, ES values                                                                                   | 1    |
| `src/locales/keys.ts`                      | Add dynamic-key declarations for any `t(\`landing.featurePreview.${key}\`)` style accesses             | 1    |
| `index.html`                               | Add OG + Twitter meta tags; update title and description                                               | 1    |
| `package.json`                             | Add `"screenshots": "tsx scripts/screenshots.ts"` script; add `tsx` to devDependencies                 | 2    |
| `.gitignore`                               | Add `.claude/` entry                                                                                   | 3    |
| `README.md`                                | Full rewrite per spec §4.5                                                                             | 3    |
| `src/components/landing/LandingFooter.tsx` | Replace placeholder Vercel URL with the actual one once Vercel is linked                               | 4    |
| `README.md`                                | Add live-demo badge with the actual Vercel URL                                                         | 4    |

### Spec coverage map

| Spec section                         | Task(s)           |
| ------------------------------------ | ----------------- |
| §4.1 Landing shape                   | Task 1            |
| §4.2 Screenshot pipeline             | Task 2            |
| §4.3 Vercel deploy                   | Task 4            |
| §4.4 Lighthouse CI                   | Task 5            |
| §4.5 README anatomy                  | Task 3            |
| §5 New component files               | Tasks 1, 2, 5     |
| §6 Landing dictionary keys + ES copy | Tasks 1, 3        |
| §7 Screenshot / badge style          | Tasks 1, 2        |
| §8 Error handling                    | Tasks 2, 5        |
| §9 Testing strategy                  | Tasks 1, 2        |
| §10 Rollout                          | All tasks         |
| §12 Exit criteria                    | Task 5 final step |

---

## Task 1: Landing page polish

**Branch:** `feat/phase-7-landing-polish`

**Goal:** Expand the landing page from two sections (hero + role cards) to five (hero / role cards / feature preview / tech stack / footer). Add OG + Twitter meta tags for social previews. All new copy bilingual.

**Files:**

- Create: `src/components/landing/HeroScreenshot.tsx`
- Create: `src/components/landing/FeaturePreview.tsx`
- Create: `src/components/landing/TechStack.tsx`
- Create: `src/components/landing/LandingFooter.tsx`
- Create: `src/components/landing/__tests__/FeaturePreview.test.tsx`
- Create: `src/components/landing/__tests__/LandingFooter.test.tsx`
- Create: `src/constants/landingFeatures.ts`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/keys.ts`
- Modify: `index.html`

**Screenshot placeholders:** This task references `/screenshots/hero.en.png`, `/screenshots/students.en.png`, `/screenshots/certificate.en.png`, `/screenshots/reports.en.png`. Task 2 commits those PNGs. For Task 1, commit **placeholder PNG files** (1×1 transparent PNGs) at the expected paths so the landing page doesn't 404 during dev. Task 2 replaces them with real screenshots.

### Step 1: Branch

- [ ] **1.1**:

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-7-landing-polish
```

### Step 2: Add landing dictionary keys (EN)

- [ ] **2.1** Open `src/locales/en.json`. Under the existing `landing` object, add the new nested keys. After this step, the `landing` object should look like this:

```json
"landing": {
  "enterAs": "Enter as {{role}}",
  "rolesHeading": "Choose a demo role",
  "subtitle": "Educational management platform demo. All data runs in your browser — pick a role to explore.",
  "title": "FundaVida",
  "hero": {
    "tagline": "Educational management platform — rearchitected as a browser-only portfolio demo.",
    "cta": "Enter demo",
    "screenshotAlt": "Dashboard preview with student and course statistics."
  },
  "featurePreview": {
    "heading": "A taste of what's inside",
    "students": {
      "title": "Full-CRUD students module",
      "caption": "Create, filter, search, edit, and delete. Form validation, optimistic updates, and keyboard navigation.",
      "alt": "Students list page with filter controls and seeded data."
    },
    "certificate": {
      "title": "Certificate PDF generation",
      "caption": "Eligible students earn a PDF certificate rendered in-browser via @react-pdf/renderer.",
      "alt": "Certificate preview dialog with download button."
    },
    "reports": {
      "title": "Cross-cutting reports",
      "caption": "Enrollments, average grades, attendance rates, and community hours — computed client-side.",
      "alt": "Reports dashboard with totals cards and ranking tables."
    }
  },
  "techStack": {
    "heading": "Built with"
  },
  "footer": {
    "rearchitected": "Rearchitected portfolio demo of {{org}}",
    "linkedin": "LinkedIn",
    "github": "Source",
    "org": "FundaVida org"
  }
}
```

### Step 3: Add landing dictionary keys (ES)

- [ ] **3.1** Open `src/locales/es.json`. Under the existing `landing` object, insert the same nested keys with natural Costa Rican Spanish values:

```json
"landing": {
  "enterAs": "Ingresar como {{role}}",
  "rolesHeading": "Elige un rol de demostración",
  "subtitle": "Demostración de una plataforma de gestión educativa. Todos los datos corren en tu navegador — elige un rol para explorar.",
  "title": "FundaVida",
  "hero": {
    "tagline": "Plataforma de gestión educativa — rearquitecturizada como una demo de portafolio que corre solo en el navegador.",
    "cta": "Entrar a la demo",
    "screenshotAlt": "Vista previa del panel con estadísticas de estudiantes y cursos."
  },
  "featurePreview": {
    "heading": "Una muestra de lo que hay adentro",
    "students": {
      "title": "Módulo de estudiantes con CRUD completo",
      "caption": "Crear, filtrar, buscar, editar y eliminar. Validación de formularios, actualizaciones optimistas y navegación por teclado.",
      "alt": "Página de lista de estudiantes con controles de filtro y datos de ejemplo."
    },
    "certificate": {
      "title": "Generación de certificados en PDF",
      "caption": "Los estudiantes elegibles reciben un certificado en PDF renderizado en el navegador con @react-pdf/renderer.",
      "alt": "Diálogo de vista previa del certificado con botón de descarga."
    },
    "reports": {
      "title": "Reportes transversales",
      "caption": "Matrículas, notas promedio, tasas de asistencia y horas de comunidad — calculadas en el cliente.",
      "alt": "Panel de reportes con tarjetas de totales y tablas de clasificación."
    }
  },
  "techStack": {
    "heading": "Hecho con"
  },
  "footer": {
    "rearchitected": "Demo de portafolio rearquitecturizada de {{org}}",
    "linkedin": "LinkedIn",
    "github": "Código",
    "org": "Fundación FundaVida"
  }
}
```

### Step 4: Create the landing features constant

- [ ] **4.1** Create `src/constants/landingFeatures.ts`:

```ts
export interface LandingFeature {
  titleKey: string
  captionKey: string
  altKey: string
  image: string
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    titleKey: 'landing.featurePreview.students.title',
    captionKey: 'landing.featurePreview.students.caption',
    altKey: 'landing.featurePreview.students.alt',
    image: '/screenshots/students.en.png',
  },
  {
    titleKey: 'landing.featurePreview.certificate.title',
    captionKey: 'landing.featurePreview.certificate.caption',
    altKey: 'landing.featurePreview.certificate.alt',
    image: '/screenshots/certificate.en.png',
  },
  {
    titleKey: 'landing.featurePreview.reports.title',
    captionKey: 'landing.featurePreview.reports.caption',
    altKey: 'landing.featurePreview.reports.alt',
    image: '/screenshots/reports.en.png',
  },
]
```

### Step 5: Declare dynamic keys in `keys.ts`

- [ ] **5.1** Open `src/locales/keys.ts`. Append these declarations at the bottom, under a new comment block:

```ts
// Keys referenced via LANDING_FEATURES[].titleKey/captionKey/altKey in FeaturePreview
t('landing.featurePreview.students.title')
t('landing.featurePreview.students.caption')
t('landing.featurePreview.students.alt')
t('landing.featurePreview.certificate.title')
t('landing.featurePreview.certificate.caption')
t('landing.featurePreview.certificate.alt')
t('landing.featurePreview.reports.title')
t('landing.featurePreview.reports.caption')
t('landing.featurePreview.reports.alt')
```

### Step 6: Create placeholder PNGs at the expected paths

- [ ] **6.1** Create the `public/screenshots/` directory and populate with 1×1 transparent placeholder PNGs. Run these commands (base64-decoded transparent PNG):

```bash
mkdir -p public/screenshots
# 1x1 transparent PNG encoded as base64
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' | base64 -d > public/screenshots/hero.en.png
cp public/screenshots/hero.en.png public/screenshots/students.en.png
cp public/screenshots/hero.en.png public/screenshots/students.es.png
cp public/screenshots/hero.en.png public/screenshots/certificate.en.png
cp public/screenshots/hero.en.png public/screenshots/certificate.es.png
cp public/screenshots/hero.en.png public/screenshots/reports.en.png
cp public/screenshots/hero.en.png public/screenshots/reports.es.png
cp public/screenshots/hero.en.png public/og-image.png
```

Task 2 replaces these with real screenshots.

### Step 7: Create `HeroScreenshot.tsx`

- [ ] **7.1** Create `src/components/landing/HeroScreenshot.tsx`:

```tsx
import { useTranslation } from 'react-i18next'

export function HeroScreenshot() {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <img
        src="/screenshots/hero.en.png"
        alt={t('landing.hero.screenshotAlt')}
        width={1440}
        height={900}
        loading="eager"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  )
}
```

### Step 8: Create `FeaturePreview.tsx`

- [ ] **8.1** Create `src/components/landing/FeaturePreview.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LANDING_FEATURES } from '@/constants/landingFeatures'

export function FeaturePreview() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="feature-preview-heading" className="space-y-6">
      <h2
        id="feature-preview-heading"
        className="text-2xl font-semibold tracking-tight text-center"
      >
        {t('landing.featurePreview.heading')}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_FEATURES.map((feature) => (
          <Card key={feature.titleKey} className="overflow-hidden">
            <div className="aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={feature.image}
                alt={t(feature.altKey)}
                width={800}
                height={500}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-base">{t(feature.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t(feature.captionKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
```

### Step 9: Create `TechStack.tsx`

- [ ] **9.1** Create `src/components/landing/TechStack.tsx`:

```tsx
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
```

### Step 10: Create `LandingFooter.tsx`

- [ ] **10.1** Create `src/components/landing/LandingFooter.tsx`. The Vercel URL is a `# TODO` until Task 4 — use the GitHub repo URL as a placeholder for now (`https://github.com/rjwrld/FundaVida`):

```tsx
import { useTranslation } from 'react-i18next'

export function LandingFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t pt-6">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{t('landing.footer.rearchitected', { org: 'FundaVida' })}</span>
        <a
          href="https://www.fundavida.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.org')}
        </a>
        <a
          href="https://github.com/rjwrld/FundaVida"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.github')}
        </a>
        <a
          href="https://www.linkedin.com/in/rjwrld/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.linkedin')}
        </a>
      </div>
    </footer>
  )
}
```

### Step 11: Update `LandingPage.tsx`

- [ ] **11.1** Replace the contents of `src/pages/LandingPage.tsx` with:

```tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { HeroScreenshot } from '@/components/landing/HeroScreenshot'
import { FeaturePreview } from '@/components/landing/FeaturePreview'
import { TechStack } from '@/components/landing/TechStack'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { useStore } from '@/data/store'
import { ROLES } from '@/constants/roles'
import type { Role } from '@/types'

export function LandingPage() {
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()
  const { t } = useTranslation()

  function enter(role: Role) {
    setRole(role)
    navigate('/app')
  }

  return (
    <main className="relative mx-auto max-w-5xl space-y-16 px-6 py-12">
      <div className="absolute right-6 top-6">
        <LanguageToggle variant="landing" />
      </div>

      <header className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4 text-center lg:text-left">
          <h1 className="text-4xl font-semibold tracking-tight">{t('landing.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('landing.hero.tagline')}</p>
          <div className="flex justify-center lg:justify-start">
            <Button size="lg" onClick={() => enter('admin')}>
              {t('landing.hero.cta')}
            </Button>
          </div>
        </div>
        <HeroScreenshot />
      </header>

      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="sr-only">
          {t('landing.rolesHeading')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <Card key={r.value}>
              <CardHeader>
                <CardTitle>{t(r.labelKey)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t(r.blurbKey)}</p>
                <Button onClick={() => enter(r.value)}>
                  {t('landing.enterAs', { role: t(r.labelKey) })}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FeaturePreview />

      <TechStack />

      <LandingFooter />
    </main>
  )
}
```

### Step 12: Update `index.html` with OG + Twitter meta tags

- [ ] **12.1** Replace the `<head>` of `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>FundaVida — Educational management platform demo</title>
    <meta
      name="description"
      content="Educational management platform — rearchitected as a browser-only portfolio demo. Built with React, TypeScript, Vite, Tailwind, and shadcn/ui."
    />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="FundaVida" />
    <meta
      property="og:description"
      content="Educational management platform — rearchitected as a browser-only portfolio demo."
    />
    <meta property="og:image" content="/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="FundaVida" />
    <meta
      name="twitter:description"
      content="Educational management platform — rearchitected as a browser-only portfolio demo."
    />
    <meta name="twitter:image" content="/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 13: Write a failing unit test for FeaturePreview

- [ ] **13.1** Create `src/components/landing/__tests__/FeaturePreview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { FeaturePreview } from '../FeaturePreview'

function renderWithI18n() {
  return render(
    <I18nextProvider i18n={i18n}>
      <FeaturePreview />
    </I18nextProvider>
  )
}

describe('FeaturePreview', () => {
  it('renders three feature cards with translated titles', () => {
    renderWithI18n()
    expect(screen.getByText('Full-CRUD students module')).toBeInTheDocument()
    expect(screen.getByText('Certificate PDF generation')).toBeInTheDocument()
    expect(screen.getByText('Cross-cutting reports')).toBeInTheDocument()
  })

  it('renders three images with translated alt text', () => {
    renderWithI18n()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute(
      'alt',
      'Students list page with filter controls and seeded data.'
    )
  })
})
```

- [ ] **13.2** Run it and verify it passes:

```bash
npm run test -- FeaturePreview
```

Expected: 2 tests pass. (The file is brand-new and the component exists — it should pass immediately. If it fails, the dictionary wiring in Steps 2-3 is likely missing a key.)

### Step 14: Write a test for LandingFooter

- [ ] **14.1** Create `src/components/landing/__tests__/LandingFooter.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { LandingFooter } from '../LandingFooter'

describe('LandingFooter', () => {
  it('renders external links with rel="noopener noreferrer"', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LandingFooter />
      </I18nextProvider>
    )
    const linkedinLink = screen.getByRole('link', { name: /linkedin/i })
    expect(linkedinLink).toHaveAttribute('target', '_blank')
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the FundaVida org and source links', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LandingFooter />
      </I18nextProvider>
    )
    expect(screen.getByRole('link', { name: /fundavida org/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /source/i })).toBeInTheDocument()
  })
})
```

- [ ] **14.2** Run:

```bash
npm run test -- LandingFooter
```

Expected: 2 tests pass.

### Step 15: Run the full gauntlet

- [ ] **15.1**:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

All must pass. If `i18n:check` fails it means a key in code isn't in both locales, or vice versa — fix whichever locale is missing.

- [ ] **15.2** Run e2e:

```bash
npm run e2e
```

All 30+ tests must pass. The existing `i18n.spec.ts` tests assert landing behavior — verify no regression.

### Step 16: Commit

- [ ] **16.1**:

```bash
git add src/components/landing \
  src/constants/landingFeatures.ts \
  src/pages/LandingPage.tsx \
  src/locales/en.json src/locales/es.json src/locales/keys.ts \
  index.html \
  public/screenshots public/og-image.png
git commit -m "feat: add landing hero, feature preview, tech stack, footer"
```

Lowercase `add`. No `Co-Authored-By: Claude`. No "Generated with Claude Code"/🤖.

### Step 17: Push + PR

- [ ] **17.1**:

```bash
git push -u origin feat/phase-7-landing-polish
gh pr create --title "feat: add landing hero, feature preview, tech stack, footer" --body "$(cat <<'EOF'
## Summary
- Expand landing page to five sections: hero with screenshot, role cards (existing), feature preview (3 cards), tech stack badges, footer.
- Add ~15 new dictionary keys per locale (landing.hero, landing.featurePreview, landing.techStack, landing.footer).
- Add OG + Twitter meta tags in index.html for rich social previews.
- Commit placeholder 1x1 PNGs at public/screenshots/*; Task 2 replaces with real screenshots.

## Test plan
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run test
- [x] npm run i18n:check
- [x] npm run build
- [x] npm run e2e
EOF
)"
```

- [ ] **17.2** Watch CI. Stop here.

---

## Task 2: Screenshot pipeline

**Branch:** `feat/phase-7-screenshots`

**Goal:** Replace the placeholder PNGs from Task 1 with real screenshots. Add a `scripts/screenshots.ts` that uses `@playwright/test`'s `chromium` API to deterministically capture 8 PNGs.

**Files:**

- Create: `scripts/screenshots.ts`
- Modify: `package.json` (add `tsx` devDep + `screenshots` script)
- Replace: `public/screenshots/*.png` (8 files, real content)
- Replace: `public/og-image.png`

**Determinism note:** The seed functions in `src/data/seed/*.ts` already call `faker.seed(42)`, so store state is deterministic after `resetDemo()`. The screenshot script must call `resetDemo()` before each capture run to guarantee the same students/courses/grades appear.

### Step 1: Branch

- [ ] **1.1**:

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-7-screenshots
```

### Step 2: Add `tsx` to devDependencies and script

- [ ] **2.1**:

```bash
npm install --save-dev tsx@^4.19.0
```

- [ ] **2.2** Open `package.json`. Under `scripts`, add the `screenshots` entry (alphabetical — between `prepare` and `preview`):

```json
"screenshots": "tsx scripts/screenshots.ts",
```

Resulting `scripts` object order:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --max-warnings=0",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "i18n:extract": "i18next",
  "i18n:check": "i18next && git diff --exit-code src/locales/",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "screenshots": "tsx scripts/screenshots.ts",
  "prepare": "husky"
}
```

### Step 3: Create `scripts/screenshots.ts`

- [ ] **3.1** Create `scripts/screenshots.ts`:

```ts
/**
 * Deterministic screenshot pipeline for README + landing + OG image.
 *
 * Launches a dev server, navigates to known flows in both locales, and writes
 * PNGs to public/screenshots/ + public/og-image.png.
 *
 * Run: `npm run screenshots`
 */
import { chromium, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const SHOTS_DIR = join(PUBLIC, 'screenshots')
const DEV_PORT = 5173
const DEV_URL = `http://localhost:${DEV_PORT}`

type Locale = 'en' | 'es'

interface Shot {
  name: string
  path: string
  width: number
  height: number
  locales: Locale[]
  capture: (page: Page) => Promise<void>
}

const SHOTS: Shot[] = [
  {
    name: 'hero',
    path: '/app',
    width: 1440,
    height: 900,
    locales: ['en'],
    capture: async (page) => {
      await page.getByRole('link', { name: /dashboard/i }).click()
      await page.waitForLoadState('networkidle')
    },
  },
  {
    name: 'students',
    path: '/app/students',
    width: 1440,
    height: 900,
    locales: ['en', 'es'],
    capture: async (page) => {
      await page.waitForLoadState('networkidle')
    },
  },
  {
    name: 'certificate',
    path: '/app/certificates',
    width: 1200,
    height: 800,
    locales: ['en', 'es'],
    capture: async (page) => {
      const previewButton = page.getByRole('button', { name: /preview|vista previa/i }).first()
      await previewButton.click()
      await page.getByRole('heading', { name: /certificate preview|vista previa del certificado/i })
      await delay(1500)
    },
  },
  {
    name: 'reports',
    path: '/app/reports',
    width: 1440,
    height: 900,
    locales: ['en', 'es'],
    capture: async (page) => {
      await page.waitForLoadState('networkidle')
    },
  },
]

async function startDevServer(): Promise<ChildProcess> {
  const server = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(DEV_PORT) },
  })
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('dev server did not start in 30s')), 30_000)
    server.stdout?.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes(`localhost:${DEV_PORT}`)) {
        clearTimeout(timeout)
        resolve()
      }
    })
    server.on('error', reject)
  })
  return server
}

async function enterAsAdmin(page: Page, locale: Locale) {
  await page.goto(DEV_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const localeButton = page.getByRole('button', { name: locale })
  await localeButton.click()
  const enterButton = page
    .getByRole('button', {
      name: locale === 'en' ? /enter as admin/i : /ingresar como administrador/i,
    })
    .first()
  await enterButton.click()
  await page.waitForURL(/\/app/)
}

async function captureShot(page: Page, shot: Shot, locale: Locale) {
  const filename =
    shot.locales.length === 1
      ? `${shot.name}.en.png` // single-locale shots are always tagged 'en'
      : `${shot.name}.${locale}.png`
  const outPath = join(SHOTS_DIR, filename)

  await page.setViewportSize({ width: shot.width, height: shot.height })
  await enterAsAdmin(page, locale)
  await page.goto(`${DEV_URL}${shot.path}`)
  await shot.capture(page)
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`wrote ${filename}`)
}

async function captureOgImage(page: Page) {
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.goto(DEV_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('networkidle')
  const outPath = join(PUBLIC, 'og-image.png')
  await page.screenshot({ path: outPath, fullPage: false })
  console.log('wrote og-image.png')
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true })

  const server = await startDevServer()
  try {
    const browser = await chromium.launch()
    const context = await browser.newContext({ deviceScaleFactor: 2 })
    const page = await context.newPage()

    for (const shot of SHOTS) {
      for (const locale of shot.locales) {
        await captureShot(page, shot, locale)
      }
    }
    await captureOgImage(page)

    await browser.close()
  } finally {
    server.kill('SIGINT')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// Ensure at least one export so this file is a module under TS module resolution
export {}
```

### Step 4: Run the screenshot script

- [ ] **4.1**:

```bash
npm run screenshots
```

Expected output:

```
wrote hero.en.png
wrote students.en.png
wrote students.es.png
wrote certificate.en.png
wrote certificate.es.png
wrote reports.en.png
wrote reports.es.png
wrote og-image.png
```

If any step fails (e.g., dev server doesn't start, selector doesn't match), fix the script and rerun. The script is idempotent.

### Step 5: Visually verify screenshots

- [ ] **5.1** Open each PNG manually (Finder preview, VS Code, etc.) and confirm:
  - `hero.en.png` — dashboard with stat cards visible
  - `students.en.png` + `students.es.png` — students table with column headers in correct locale
  - `certificate.en.png` + `certificate.es.png` — preview dialog with certificate PDF visible
  - `reports.en.png` + `reports.es.png` — totals cards + section tables
  - `og-image.png` — landing page hero, 1200×630 aspect ratio

If any screenshot is wrong (wrong page, wrong locale, dialog not open, etc.), adjust the `capture` callback in `scripts/screenshots.ts` and rerun `npm run screenshots`.

### Step 6: Compress screenshots if any exceed 300 KB

- [ ] **6.1** Check file sizes:

```bash
ls -lhS public/screenshots/ public/og-image.png
```

- [ ] **6.2** If any file exceeds 300 KB, compress with `pngquant` (lossless):

```bash
npx pngquant --quality=80-95 --force --ext .png public/screenshots/*.png public/og-image.png
```

Rerun `ls -lhS` to verify all under 300 KB. If `pngquant` isn't installed, `npx` fetches it on demand (~5 MB download).

### Step 7: Run the gauntlet

- [ ] **7.1**:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

Typecheck the new `scripts/screenshots.ts` — if it isn't covered by the existing `tsconfig.json` include pattern, add it under the top-level `include` array in `tsconfig.json`. Verify first with:

```bash
grep -A 5 '"include"' tsconfig.json
```

If `scripts` isn't listed, add it:

```jsonc
"include": ["src", "e2e", "scripts", "vite.config.ts", /* …existing entries */]
```

### Step 8: Commit

- [ ] **8.1**:

```bash
git add scripts/screenshots.ts package.json package-lock.json \
  public/screenshots public/og-image.png tsconfig.json
git commit -m "feat: add deterministic screenshot pipeline"
```

### Step 9: Push + PR

- [ ] **9.1**:

```bash
git push -u origin feat/phase-7-screenshots
gh pr create --title "feat: add deterministic screenshot pipeline" --body "$(cat <<'EOF'
## Summary
- Add scripts/screenshots.ts that uses @playwright/test's chromium API to capture 8 deterministic screenshots.
- npm run screenshots regenerates hero, students (en/es), certificate (en/es), reports (en/es), and og-image.png.
- Replace Task 1 placeholder PNGs with real captures (~1-2 MB total, under GitHub README image limits).
- Screenshots are run manually, not in CI; faker.seed(42) guarantees deterministic content.

## Test plan
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run test
- [x] npm run i18n:check
- [x] npm run build
- [x] npm run screenshots  # manual verification
EOF
)"
```

- [ ] **9.2** Watch CI. Stop here.

---

## Task 3: README rewrite

**Branch:** `docs/phase-7-readme`

**Goal:** Replace the current three-line `README.md` with a polished portfolio-grade document. Borrow shape from the pre-rearchitecture README at `/Users/rj/Dev/projects/personal/FundaVida-old-ref/README.md`; contrast explicitly via a "rearchitected from production" callout. Add `.claude/` to `.gitignore`.

**Files:**

- Modify: `README.md`
- Modify: `.gitignore`

### Step 1: Branch

- [ ] **1.1**:

```bash
git checkout main && git pull origin main && git checkout -b docs/phase-7-readme
```

### Step 2: Update `.gitignore`

- [ ] **2.1** Open `.gitignore`. Under the `# Misc` section at the bottom, add a `.claude/` line:

```gitignore
# Misc
*.local

# Claude Code local settings (plugin state, untracked by intent)
.claude/
```

### Step 3: Replace `README.md`

- [ ] **3.1** Replace the entire contents of `README.md` with the following. The live-demo badge and Lighthouse badge use placeholder URLs (`https://fundavida.vercel.app/` and a placeholder Lighthouse URL) — Task 4 and Task 5 replace them with real URLs:

````markdown
# FundaVida

> Educational management platform — rearchitected as a browser-only portfolio demo.

[![Live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://fundavida.vercel.app/)
[![Build](https://img.shields.io/github/actions/workflow/status/rjwrld/FundaVida/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/rjwrld/FundaVida/actions)
![License](https://img.shields.io/github/license/rjwrld/FundaVida?style=flat-square)

FundaVida was a production educational-management platform built for a Costa Rican non-profit on React + Supabase. This repository is a **portfolio rearchitecture**: all data runs in your browser via `localStorage`, there is no backend, no auth, no secrets. The original platform's visual breadth is preserved; interactivity is deliberately tiered (full CRUD on hero modules, read-only showcase on others).

## Rearchitected from production

| Production (original)     | Portfolio demo (this repo)            |
| ------------------------- | ------------------------------------- |
| Supabase Auth + RLS       | Role switcher (no login)              |
| PostgreSQL + Storage      | Zustand + `localStorage`              |
| Resend email delivery     | Simulated (logged to the audit trail) |
| Vercel + Supabase hosting | Vercel only                           |
| Spanish-only UI           | Bilingual EN / ES (toggle top-right)  |

See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the design specs that drove each phase and [`docs/superpowers/plans/`](docs/superpowers/plans/) for the implementation plans.

## Live demo

[![Dashboard preview](public/screenshots/hero.en.png)](https://fundavida.vercel.app/)

## Stack

| Layer              | Technology                                       |
| ------------------ | ------------------------------------------------ |
| Framework          | React 18 · TypeScript (strict) · Vite            |
| Styling            | Tailwind CSS · shadcn/ui · Radix primitives      |
| State              | Zustand (persisted via `localStorage`)           |
| Data fetching      | TanStack Query                                   |
| Forms & validation | React Hook Form · Zod (t-bound factories)        |
| Routing            | React Router v6                                  |
| i18n               | react-i18next · i18next-parser (CI-gated)        |
| PDF                | @react-pdf/renderer                              |
| Testing            | Vitest · Testing Library · Playwright            |
| CI                 | GitHub Actions · Lighthouse CI · Vercel previews |

## Features by tier

### Tier 1 — Hero modules (full CRUD + deep polish)

- **Students** — create, filter, search, edit, delete. Form validation with localized messages, optimistic updates, keyboard navigation, responsive layout.
- **Courses** — pair with students via enrollments; exercises relational state.
- **Certificates** — generate and download PDFs in-browser via `@react-pdf/renderer`.

### Tier 2 — Supporting modules (basic CRUD)

- **Teachers** — referenced by courses.
- **Enrollments** — bridges students and courses.
- **Grades** — referenced by certificates (70+ threshold = eligible).

### Tier 3 — Read-only showcase

- **Attendance** — pre-seeded records.
- **Bulk Email** — draft, recipient filter preview, send (simulated, logged to audit).
- **Reports** — cross-cutting totals, averages, attendance rates, community hours.
- **Audit Logs** — every create/update/delete since the last demo reset.
- **TCU** — community-service trainee records.

## Screenshots

![Students list](public/screenshots/students.en.png)
_Students module — CRUD with search, filters, form validation._

![Certificate preview](public/screenshots/certificate.en.png)
_Certificates module — PDF preview + download._

![Reports dashboard](public/screenshots/reports.en.png)
_Reports module — client-side aggregates._

### Bilingual in action

| English                                            | Español                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| ![Students EN](public/screenshots/students.en.png) | ![Students ES](public/screenshots/students.es.png) |

Every module ships in both locales; `npm run i18n:check` fails CI on any missing translation.

## Getting started

```bash
git clone https://github.com/rjwrld/FundaVida.git
cd FundaVida
npm install
npm run dev
```
````

No environment variables required. The demo seeds deterministic data on first load (`faker.seed(42)`).

## Scripts

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Start Vite dev server                       |
| `npm run build`         | Typecheck + production build                |
| `npm run typecheck`     | `tsc --noEmit`                              |
| `npm run lint`          | ESLint (zero warnings allowed)              |
| `npm run format`        | Prettier write                              |
| `npm run format:check`  | Prettier check (CI-gated)                   |
| `npm run i18n:extract`  | Extract translation keys via i18next-parser |
| `npm run i18n:check`    | Extract + diff; fails if locale files drift |
| `npm run test`          | Vitest (unit + component)                   |
| `npm run test:coverage` | Vitest with coverage report                 |
| `npm run e2e`           | Playwright end-to-end suite                 |
| `npm run e2e:ui`        | Playwright UI mode                          |
| `npm run screenshots`   | Regenerate landing + README screenshots     |

## Project structure

```
src/
├── app/              # App shell & layout
├── components/
│   ├── landing/      # Landing-only components (hero, features, tech stack, footer)
│   ├── layout/       # Shared layout (header, sidebar, language toggle)
│   ├── ui/           # shadcn/ui primitives
│   └── [feature]/    # Feature-specific components
├── constants/        # Static configuration
├── data/
│   ├── api/          # Thin hooks atop @tanstack/react-query
│   ├── schemas/      # Zod schema factories (buildXSchema(t))
│   ├── seed/         # Deterministic faker.seed(42) generators
│   └── store.ts      # Zustand root store
├── hooks/            # Custom React hooks (useFormat, useCurrentUser, …)
├── lib/              # Format helpers, report builders, PDF templates
├── locales/          # en.json + es.json dictionaries + keys.ts parser hints
├── pages/            # Route-level components
└── types/            # Shared TS types
```

## Phase history

| Phase | Focus                                            | Design spec                                                                               |
| ----- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1     | Scaffold, tooling, CI                            | [spec](docs/superpowers/specs/2026-04-21-fundavida-portfolio-polish-design.md) (umbrella) |
| 2     | Data layer, persistence, role switcher           | [plan](docs/superpowers/plans/2026-04-22-phase-2-data-layer-and-role-switcher.md)         |
| 3     | Tier 1 modules (Students, Courses, Certificates) | [plan](docs/superpowers/plans/2026-04-22-phase-3-tier-1-modules.md)                       |
| 4     | Tier 2 modules (Teachers, Enrollments, Grades)   | [plan](docs/superpowers/plans/2026-04-22-phase-4-tier-2-modules.md)                       |
| 5a    | TCU + Attendance                                 | [plan](docs/superpowers/plans/2026-04-22-phase-5a-tcu-and-attendance.md)                  |
| 5b    | Reports, Audit Logs, Bulk Email                  | [plan](docs/superpowers/plans/2026-04-22-phase-5b-reports-audit-email.md)                 |
| 6     | i18n EN / ES                                     | [spec](docs/superpowers/specs/2026-04-22-phase-6-i18n-design.md)                          |
| 7     | Portfolio polish + deploy                        | [spec](docs/superpowers/specs/2026-04-23-phase-7-portfolio-polish-and-deploy-design.md)   |

Each phase → one branch per task → one PR → one merge. The [merged PR list](https://github.com/rjwrld/FundaVida/pulls?q=is%3Apr+is%3Amerged) is itself a portfolio artifact.

## Author

Built by **Josue Calderon** as a portfolio rearchitecture of a college project.

- LinkedIn: [linkedin.com/in/rjwrld](https://www.linkedin.com/in/rjwrld/)
- GitHub: [@rjwrld](https://github.com/rjwrld)

---

<details>
<summary><strong>Sobre FundaVida</strong> — en español</summary>

[**FundaVida**](https://www.fundavida.org/) es una organización sin fines de lucro que trabaja en comunidades de alto riesgo cerca de San José, Costa Rica: Concepción de Alajuelita, 25 de Julio y Linda Vista de Patarrá.

**Misión:** empoderar a jóvenes a través de programas galardonados para superar la violencia, la pobreza y la deserción escolar.

**Programas principales:**

- Centros de Cómputo Interactivos
- Inglés
- Jóvenes con Propósito
- Consejería
- Apoyo Educativo

Este repositorio es una **rearquitecturización de portafolio** de una plataforma original construida con React + Supabase para FundaVida. Toda la data corre en tu navegador; no hay backend, ni autenticación, ni secretos. La interfaz está traducida al español y se puede alternar con el botón de idioma en la esquina superior derecha.

> "La esperanza lo cambia todo."

Visita [fundavida.org](https://www.fundavida.org/) para conocer cómo contribuir con donaciones, voluntariado o alianzas.

</details>
```

### Step 4: Verify `.gitignore` now tracks `.claude/` as ignored

- [ ] **4.1**:

```bash
git check-ignore -v .claude/ 2>&1
```

Expected output: one line showing `.gitignore:` followed by line number and the `.claude/` pattern. If no output, the pattern isn't matching — check Step 2 carefully.

### Step 5: Preview README locally

- [ ] **5.1** Use a markdown previewer. Simplest:

```bash
npx --yes markdown-live-preview README.md
```

Or open in a VS Code / Cursor markdown preview pane. Verify:

- Badges render at top (will show as broken until Task 4/5 wire real URLs — expected)
- Rearchitecture delta table renders as a 2-col table
- Live-demo image loads (from Task 2's `public/screenshots/hero.en.png`)
- `<details>` section collapses / expands

### Step 6: Run gauntlet

- [ ] **6.1**:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build && npm run e2e
```

All must pass. No source code changed, but `format:check` runs on the README.

### Step 7: Commit

- [ ] **7.1**:

```bash
git add README.md .gitignore
git commit -m "docs: rewrite readme for portfolio presentation"
```

### Step 8: Push + PR

- [ ] **8.1**:

```bash
git push -u origin docs/phase-7-readme
gh pr create --title "docs: rewrite readme for portfolio presentation" --body "$(cat <<'EOF'
## Summary
- Replace the three-line scaffolding README with a full portfolio-grade document.
- Lead with a "rearchitected from production" callout and a delta table (Supabase + Auth + RLS → localStorage + role switcher).
- Embed Task 2 screenshots, including an EN/ES pair for the bilingual callout.
- Link each merged phase to its design spec + plan; note the merged PR list as a portfolio artifact itself.
- Preserve the "Sobre FundaVida" org context + mission in a collapsed ES <details> section at the bottom.
- Add .claude/ to .gitignore so local plugin settings stop being one stray git add . away from leaking.

## Test plan
- [x] README renders cleanly top-to-bottom in a markdown previewer
- [x] Screenshots load (relative paths resolve on GitHub)
- [x] <details> section expands on click
- [x] All gauntlet checks pass
EOF
)"
```

- [ ] **8.2** Watch CI. Stop here.

---

## Task 4: Vercel deploy

**Branch:** `chore/phase-7-vercel-deploy`

**Goal:** Link the repo to a new Vercel project, verify production deploy on `main` and preview deploys on PRs, enable Vercel Analytics, surface the live URL in README + landing footer.

**Files:**

- Modify: `README.md` (replace placeholder Vercel URL with real one)
- Modify: `src/components/landing/LandingFooter.tsx` (add live-demo link)

**Prerequisites:** Vercel account with free hobby tier. `vercel` CLI installed (`npm i -g vercel` or use `npx vercel`).

### Step 1: Branch

- [ ] **1.1**:

```bash
git checkout main && git pull origin main && git checkout -b chore/phase-7-vercel-deploy
```

### Step 2: Link the repo to a Vercel project

- [ ] **2.1** Run:

```bash
npx vercel link
```

Interactive prompts:

- Set up and deploy? **Yes** (or `n` if you just want link-without-deploy)
- Which scope? Your personal scope
- Link to existing project? **No**
- Project name? `fundavida` (or whatever Vercel suggests; aim for short)
- Directory? `./`
- Auto-detected framework: **Vite** (confirm)
- Override settings? **No**

This creates `.vercel/project.json` locally.

- [ ] **2.2** Confirm `.vercel/` is already gitignored:

```bash
git check-ignore -v .vercel/
```

If not ignored, add `.vercel/` to `.gitignore` before continuing.

### Step 3: Deploy to production

- [ ] **3.1**:

```bash
npx vercel --prod
```

Expected output: a deploy URL like `https://fundavida-<hash>.vercel.app` or `https://fundavida.vercel.app`. **Write down the exact URL** — you'll need it for Steps 5 and 7.

### Step 4: Enable Vercel Analytics

- [ ] **4.1** Open the Vercel dashboard → Project → Analytics tab. Click "Enable" (hobby plan includes basic Analytics free).

No SDK change needed — the analytics script is injected automatically via Vercel's CDN.

- [ ] **4.2** Open the production URL in a fresh private window. Reload once. Return to the Analytics tab and verify at least one pageview registers within 60 seconds.

### Step 5: Verify preview deploys on PRs

- [ ] **5.1** This check runs implicitly when you open this task's PR — Vercel's GitHub integration posts a preview URL as a check on every PR. Skip for now; confirm in Step 10 when this task's PR is up.

### Step 6: Update README with the real Vercel URL

- [ ] **6.1** Replace every occurrence of `https://fundavida.vercel.app/` in `README.md` with the actual URL from Step 3. If Vercel assigned `https://fundavida.vercel.app/` (clean alias), no change needed. If it assigned something with a hash suffix, update all three occurrences:

```bash
# sanity check: count occurrences
grep -c 'fundavida.vercel.app' README.md
# expected: 3 (badge + live demo anchor + feature-image linked to demo)
```

- [ ] **6.2** Also update the repo description / website field on GitHub's repo settings (manual, in the GitHub UI → Settings → General → Website): set to the production URL.

### Step 7: Update `LandingFooter.tsx` with the live demo link

- [ ] **7.1** Open `src/components/landing/LandingFooter.tsx` and add a "Live demo" link. The footer becomes (replace the file contents):

```tsx
import { useTranslation } from 'react-i18next'

const LIVE_DEMO_URL = 'https://fundavida.vercel.app/'

export function LandingFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t pt-6">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{t('landing.footer.rearchitected', { org: 'FundaVida' })}</span>
        <a
          href={LIVE_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.liveDemo')}
        </a>
        <a
          href="https://www.fundavida.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.org')}
        </a>
        <a
          href="https://github.com/rjwrld/FundaVida"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.github')}
        </a>
        <a
          href="https://www.linkedin.com/in/rjwrld/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t('landing.footer.linkedin')}
        </a>
      </div>
    </footer>
  )
}
```

Replace `LIVE_DEMO_URL` value with the actual URL from Step 3.

- [ ] **7.2** Add the `landing.footer.liveDemo` translation key to both locales.

`src/locales/en.json` under `landing.footer`:

```json
"liveDemo": "Live demo"
```

`src/locales/es.json` under `landing.footer`:

```json
"liveDemo": "Demo en vivo"
```

### Step 8: Update the LandingFooter test

- [ ] **8.1** Open `src/components/landing/__tests__/LandingFooter.test.tsx` and add one more assertion. After the existing `renders the FundaVida org and source links` test, add:

```tsx
it('renders the live demo link', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <LandingFooter />
    </I18nextProvider>
  )
  const demoLink = screen.getByRole('link', { name: /live demo/i })
  expect(demoLink).toHaveAttribute('href', 'https://fundavida.vercel.app/')
  expect(demoLink).toHaveAttribute('target', '_blank')
  expect(demoLink).toHaveAttribute('rel', 'noopener noreferrer')
})
```

(Replace the URL in the assertion to match your real Vercel URL.)

### Step 9: Run gauntlet

- [ ] **9.1**:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build && npm run e2e
```

All must pass.

### Step 10: Commit + push + PR

- [ ] **10.1**:

```bash
git add README.md src/components/landing/LandingFooter.tsx \
  src/components/landing/__tests__/LandingFooter.test.tsx \
  src/locales/en.json src/locales/es.json
git commit -m "chore: wire vercel production deploy and surface live demo url"
```

- [ ] **10.2**:

```bash
git push -u origin chore/phase-7-vercel-deploy
gh pr create --title "chore: wire vercel production deploy and surface live demo url" --body "$(cat <<'EOF'
## Summary
- Link the repo to a new Vercel project; production deploys on main, preview deploys on every PR.
- Enable Vercel Analytics (anonymous, GDPR-friendly).
- Replace placeholder README URLs with the real Vercel production URL (3 occurrences).
- Add Live demo link to the landing footer in both locales.
- Update GitHub repo description / website to the production URL.

## Test plan
- [x] Production URL loads and enters the demo as Admin.
- [x] Language toggle flips locale in production.
- [x] Vercel Analytics dashboard registers pageviews.
- [x] npm run typecheck / lint / test / i18n:check / build / e2e
EOF
)"
```

- [ ] **10.3** On the PR page, verify Vercel's preview check posts a preview URL. Open it, verify the preview loads the current branch's code. Watch CI. Stop here.

---

## Task 5: Lighthouse CI

**Branch:** `chore/phase-7-lighthouse`

**Goal:** Add a Lighthouse CI workflow that runs against each PR's Vercel preview URL with soft threshold gates (Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 95). Post scores as a PR comment. Add a Lighthouse badge to the README.

**Files:**

- Create: `.github/workflows/lighthouse.yml`
- Create: `.github/lighthouse-budget.json`
- Modify: `README.md` (add Lighthouse badge)

### Step 1: Branch

- [ ] **1.1**:

```bash
git checkout main && git pull origin main && git checkout -b chore/phase-7-lighthouse
```

### Step 2: Create `.github/lighthouse-budget.json`

- [ ] **2.1**:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

### Step 3: Create `.github/workflows/lighthouse.yml`

- [ ] **3.1**:

```yaml
name: lighthouse

on:
  pull_request:
    branches: [main]

concurrency:
  group: lighthouse-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
  deployments: read

jobs:
  lighthouse:
    name: lighthouse audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Wait for Vercel preview deploy
        id: wait
        uses: patrickedqvist/wait-for-vercel-preview@v1.3.2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          max_timeout: 300

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            ${{ steps.wait.outputs.url }}
            ${{ steps.wait.outputs.url }}/app
          configPath: .github/lighthouse-budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Step 4: Verify the workflow syntax locally

- [ ] **4.1**:

```bash
# Optional: install actionlint to catch syntax errors
npx --yes @rhysd/actionlint .github/workflows/lighthouse.yml 2>&1 || true
```

If `actionlint` reports errors, fix them. If it reports nothing or isn't installed, the GitHub check will surface issues on the PR.

### Step 5: Add the Lighthouse badge to README

- [ ] **5.1** Open `README.md`. Under the existing badge row at the top, add a Lighthouse badge. After edit, the badge row becomes:

```markdown
[![Live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://fundavida.vercel.app/)
[![Build](https://img.shields.io/github/actions/workflow/status/rjwrld/FundaVida/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/rjwrld/FundaVida/actions)
[![Lighthouse](https://img.shields.io/github/actions/workflow/status/rjwrld/FundaVida/lighthouse.yml?branch=main&label=lighthouse&style=flat-square)](https://github.com/rjwrld/FundaVida/actions/workflows/lighthouse.yml)
![License](https://img.shields.io/github/license/rjwrld/FundaVida?style=flat-square)
```

### Step 6: Gauntlet

- [ ] **6.1**:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build && npm run e2e
```

All must pass. No source changes; workflow YAML doesn't touch the app.

### Step 7: Commit + push + PR

- [ ] **7.1**:

```bash
git add .github/workflows/lighthouse.yml .github/lighthouse-budget.json README.md
git commit -m "chore: add lighthouse ci soft gate with pr comment"
```

- [ ] **7.2**:

```bash
git push -u origin chore/phase-7-lighthouse
gh pr create --title "chore: add lighthouse ci soft gate with pr comment" --body "$(cat <<'EOF'
## Summary
- Add .github/workflows/lighthouse.yml that runs treosh/lighthouse-ci-action@v12 against every PR's Vercel preview.
- Waits up to 5 minutes for the Vercel preview to be ready, then audits both / and /app.
- Thresholds (soft fail): Perf ≥ 0.9, A11y ≥ 0.95, Best Practices ≥ 0.95, SEO ≥ 0.95.
- Non-required status check — scores surface as a red check on threshold breach but don't block merge.
- Add Lighthouse badge to README; it will turn green once the first run on main completes.

## Test plan
- [x] Workflow YAML lints cleanly.
- [x] On this PR, the Lighthouse job runs, waits for the Vercel preview, and posts scores.
- [x] Scores visible as a build artifact (`treosh/lighthouse-ci-action` uploads the reports).
EOF
)"
```

- [ ] **7.3** On the PR page, watch the Lighthouse job run. It should:
  1. Wait for Vercel's preview URL
  2. Run Lighthouse against `/` and `/app`
  3. Post scores or fail threshold assertions

Verify the job either passes (all ≥ thresholds) or fails cleanly with threshold diagnostics. If it fails due to flakes (network variability), note it in the PR description — the gate is soft, so merge anyway. Track score trends for a few PRs before considering upgrading to a required check.

Stop here.

---

## Task 6: Phase 7 cleanup (conditional)

**Branch:** `chore/phase-7-cleanup`

**Scope:** Only if a holistic cross-cutting review of the merged Tasks 1-5 surfaces Important+ findings. Same shape as Phase 3 PR #20, Phase 4 PR #24, Phase 5a PR #27, Phase 5b cleanup, Phase 6 PR #38.

### Step 1: Branch

- [ ] **1.1**:

```bash
git checkout main && git pull origin main && git checkout -b chore/phase-7-cleanup
```

### Step 2: Holistic review

- [ ] **2.1** Dispatch the `superpowers:code-reviewer` subagent with this prompt:

> "Review the last five merged PRs on `main` (the Phase 7 portfolio-polish work). Focus on: (a) broken markdown links, dead image references, or screenshots missing from `public/screenshots/`; (b) inconsistent Vercel URLs between README, landing footer, and `og:image` meta tags; (c) landing copy that reads awkwardly in Spanish (native Costa Rican speaker lens); (d) Lighthouse thresholds that are too lenient (if actual scores consistently exceed the soft floor) or too strict (if builds are noisy); (e) screenshots that rot relative to current UI state; (f) any `Co-Authored-By: Claude` or 'Generated with Claude Code' trailers that slipped in. Rate each finding Critical / Important / Nit. Ignore Nits."

- [ ] **2.2** For each Important-or-above finding, apply the fix in this same branch.

### Step 3: Gauntlet + commit + PR

- [ ] **3.1**:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build && npm run e2e
```

- [ ] **3.2**:

```bash
git add <files from fixes>
git commit -m "chore: address phase 7 cleanup review feedback"
```

- [ ] **3.3**:

```bash
git push -u origin chore/phase-7-cleanup
gh pr create --title "chore: address phase 7 cleanup review feedback" --body "$(cat <<'EOF'
## Summary
- <bullet per finding from the review subagent>

## Test plan
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run test
- [x] npm run i18n:check
- [x] npm run build
- [x] npm run e2e
EOF
)"
```

- [ ] **3.4** Watch CI. Do not merge yourself.

If the review finds zero actionable items, **skip this Task** — push nothing and close the branch locally.

---

## Phase 7 Exit Criteria

When Tasks 1-5 (and optionally 6) are merged:

- Landing page renders the five sections (hero / role cards / feature preview / tech stack / footer) in both EN and ES. The Enter Demo CTA above the fold lands on `/app` as Admin.
- `npm run screenshots` regenerates all 8 PNGs from a clean checkout in under 2 minutes. Reruns produce visually identical output (minor sub-pixel font differences acceptable).
- `README.md` loads on GitHub with the live-demo badge + CI badges + Lighthouse badge + embedded screenshots + EN/ES comparison + collapsed `<details>` ES section.
- Pasting the Vercel URL into LinkedIn, Slack, or Twitter renders a rich preview card with the 1200×630 OG image.
- Production URL is live; preview URLs post on every PR; Vercel Analytics is collecting pageviews.
- Every PR shows a Lighthouse job with scores in a PR comment; failures turn the check red but do not block merge.
- `.claude/` is gitignored.
- Conventional commits on every Phase 7 PR. No `Co-Authored-By: Claude` trailers. No "Generated with Claude Code" footers.
- Repo at 42-44 merged PRs on `main`, all conventional-commit, all green on CI.

## Deferred to later phases

- Custom domain (`fundavida.rjwrld.dev` or similar under a domain you own) — 10-minute DNS tweak when ready.
- Full `README.es.md` mirror — lift the `<details>` block into a standalone file.
- Hard Lighthouse gate as a required status check — upgrade when scores have been stable for 2-3 weeks.
- Visual regression testing (Chromatic, Percy).
- Real-user-monitoring dashboards beyond default Vercel Analytics.
- Certificate PDF body translation.
- Audit-log `summary` free-text translation.
- Third locale (pt-BR, fr).
