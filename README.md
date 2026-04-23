# FundaVida

> Educational management platform — rearchitected as a browser-only portfolio demo.

[![Live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://fundavida.vercel.app/)
[![Build](https://img.shields.io/github/actions/workflow/status/rjwrld/FundaVida/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/rjwrld/FundaVida/actions)

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
├── App.tsx           # App shell & router
├── main.tsx          # Vite entry
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
│   ├── persistence.ts # localStorage adapter
│   ├── debounce.ts   # Persistence debouncer
│   └── store.ts      # Zustand root store
├── hooks/            # Custom React hooks (useFormat, useCurrentUser, …)
│   └── api/          # Feature-scoped @tanstack/react-query hooks
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

Este repositorio es una **rearquitectura de portafolio** de una plataforma original construida con React + Supabase para FundaVida. Toda la data corre en tu navegador; no hay backend, ni autenticación, ni secretos. La interfaz está traducida al español y se puede alternar con el botón de idioma en la esquina superior derecha.

> "La esperanza lo cambia todo."

Visita [fundavida.org](https://www.fundavida.org/) para conocer cómo contribuir con donaciones, voluntariado o alianzas.

</details>
