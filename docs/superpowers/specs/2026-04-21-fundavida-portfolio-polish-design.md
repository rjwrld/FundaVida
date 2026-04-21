# FundaVida Portfolio Rearchitecture — Design Spec

**Date:** 2026-04-21
**Status:** Approved for planning
**Author:** rj

---

## 1. Purpose

Rearchitect the FundaVida educational-management platform (originally a college project built with Lovable + Supabase) into a standalone, always-on, zero-cost demo suitable as a LinkedIn portfolio piece. The demo must:

- Run entirely in the browser with no paid backend dependencies.
- Present as a professional-grade product to technical recruiters.
- Ship from a new public GitHub repository with clean commit and PR history.
- Preserve the full visual breadth of the original platform while scoping interactivity deliberately.

## 2. Background

The original application is a Spanish-language educational-management platform for a Costa Rican non-profit. It comprises ~117 pages, 11 feature modules, and deep Supabase coupling (30+ tables with RLS, 3 Edge Functions, Auth, Storage). The current codebase has several portfolio-unfriendly signals: hardcoded keys in source, lenient TypeScript and ESLint configs, no tests, no CI, vague commit history ("Changes" commits), large monolithic form components (660+ lines), and Spanish-only UI that limits global recruiter reach.

## 3. Goals

1. Zero ongoing hosting cost with zero idle-sleep behavior.
2. Clean `main` branch built from scratch via conventional-commit PRs — the PR list itself is a portfolio artifact.
3. Deep polish on a small number of flagship flows; breadth preserved through navigable read-only modules.
4. Strict TypeScript, ESLint, and test baselines enforced from the first commit.
5. Bilingual (English default, Spanish toggle) UI for global reach while honoring the project's origin.

## 4. Non-goals

- Real authentication. The demo uses a role-switcher; no passwords, no session management.
- Migrating features to another Backend-as-a-Service (Firebase, Convex, Appwrite, etc.). All data lives in-browser.
- Server-side rendering or Next.js conversion. The app remains a Vite SPA.
- PWA / offline mode beyond what localStorage naturally provides.
- i18n coverage for every screen in v1 — landing page, navigation, and hero flows are bilingual; Tier 3 modules may ship Spanish-first and earn English copy in a follow-up PR.
- Preserving or migrating the original Supabase data. Production data is not relevant to the demo.

## 5. Scope — Tiered Module Strategy

The platform's 11 modules are assigned to three tiers based on interaction depth:

### Tier 1 — Hero modules (full CRUD, deep polish)

| Module | Rationale |
|---|---|
| **Students** | Core domain entity; most commonly exercised flow |
| **Courses** | Natural pairing with Students; exercises relational state |
| **Certificates** | Visually dramatic end-to-end flow (generate + download PDF in-browser) |

Hero modules support: create, read, update, delete, filter, search, sort, optimistic updates, proper empty/loading/error states, keyboard navigation, responsive layout, and full i18n.

### Tier 2 — Supporting modules (basic CRUD, standard polish)

| Module | Rationale |
|---|---|
| **Teachers** | Referenced by Courses |
| **Enrollments** | Bridges Students and Courses |
| **Grades** | Referenced by Certificates (approval threshold) |

Supporting modules support: create, read, update, delete on the happy path. Advanced features (bulk operations, complex filters, exports) are deferred — the UI may show them as demo-disabled.

### Tier 3 — Read-only showcase modules

| Module | Rationale |
|---|---|
| **Attendance** | Pre-seeded records demonstrate the feature exists |
| **Bulk Email Campaigns** | View composed campaigns + recipient lists; `<DemoReadOnly>` modal previews what production delivery looks like |
| **Reports / Analytics** | Pre-computed charts with seeded data |
| **Audit Logs** | Seeded log entries demonstrate governance posture |
| **TCU** | View-only trainee records; shows role-based UI variation |

Tier 3 modules display seeded data; mutation controls are replaced by a shared `<DemoReadOnly action="..." />` wrapper that renders a tasteful modal explaining what the production flow does.

## 6. Architecture

### 6.1 Runtime

Pure Single-Page Application. `vite build` produces static files served by Vercel's CDN. No server. No API calls. No external services at runtime (except Vercel Analytics, which is anonymous and GDPR-friendly).

### 6.2 Folder layout (`src/`)

```
src/
├── app/                  → routing, layouts (unchanged from original)
├── components/
│   ├── ui/               → shadcn primitives (unchanged)
│   ├── demo/             → NEW: <DemoReadOnly>, <RoleSwitcher>, <DemoBanner>, <DemoModePreview>
│   └── [feature]/        → existing domain components, touched minimally
├── data/                 → NEW: mock data layer
│   ├── seed/             → JSON fixtures per domain
│   ├── store.ts          → Zustand root store
│   ├── persistence.ts    → localStorage sync with version tag + reset
│   └── api/              → typed query/mutation functions mimicking the Supabase call shape
├── hooks/                → React Query wrappers over data/api (signatures preserved so page code is unchanged)
├── lib/
│   ├── pdf/              → @react-pdf/renderer templates for certificates
│   ├── i18n.ts           → i18next initialization
│   └── utils.ts
├── locales/
│   ├── en.json
│   └── es.json
└── pages/                → existing pages, touched minimally
```

### 6.3 Data-layer contract

The `data/api/*` modules expose functions whose names and signatures match the Supabase calls currently scattered across the codebase. For example:

- Current: `supabase.from('students').select('*').eq('deleted_at', null)`
- New: `api.students.list({ includeDeleted: false })`

Each function:
- Returns a promise with ~150 ms artificial latency (so loading skeletons stay honest).
- Reads or mutates Zustand state.
- Applies role-aware filtering that mirrors the original RLS policies.
- Throws typed errors for the happy/unhappy paths (no silent failures).

This abstraction is the single most important risk reducer in the plan: ~95% of existing page code changes only its import source, not its logic.

### 6.4 State & persistence

- **Zustand** holds all domain state in a single root store (split into slices per module).
- **Seed JSON** populates the store on first load.
- **localStorage** persists mutations under a versioned key (`fundavida:v1:state`). A bump to `v2` wipes stale state.
- **Reset button** in the app footer clears localStorage and reseeds.
- **React Query** wraps the data layer so existing page hooks remain unchanged in spirit.

### 6.5 Auth & roles

- Landing page presents four "Enter demo as…" CTAs: Admin, Teacher, Student, TCU.
- Selected role is stored under `fundavida:v1:role` in localStorage.
- A `<RoleSwitcher />` in the header lets the visitor swap roles without leaving the demo.
- The data layer filters results based on the current role, reproducing the intent of the original RLS policies.

### 6.6 PDF generation

- `@react-pdf/renderer` runs entirely in the browser.
- Certificate template is a React component receiving typed props (student, course, grade, issue date).
- The hero flow ends with a native file-download prompt — no server round-trip.

### 6.7 Internationalization

- `i18next` + `react-i18next`.
- Two bundles: `en.json`, `es.json`.
- Default language: English; toggle in header; choice persisted to localStorage.
- v1 coverage: landing page, navigation, auth/role-switch screens, all Tier 1 modules, shared UI primitives.

## 7. Component & code-quality conventions

- Large forms split into focused sub-components:
  - `StudentsForm.tsx` (660 lines) → `StudentsForm` shell + `StudentsFormBasics`, `StudentsFormEducation`, `StudentsFormDocuments`.
  - `CoursesForm.tsx` (660 lines) → analogous split.
  - `Auth.tsx` (523 lines) → replaced by the simpler role-switcher; any residual surface is decomposed.
- Shared demo-mode primitives live in `src/components/demo/`.
- No `any` types. No ESLint rule disables at file or repo level.
- Components are function declarations; handlers and utilities are arrow functions.

## 8. Tooling baseline

| Tool | Configuration |
|---|---|
| TypeScript | `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUnusedLocals: true`, `noUnusedParameters: true` |
| ESLint | `@typescript-eslint/no-explicit-any: "error"`, `react-hooks/exhaustive-deps: "error"`, `no-unused-vars` re-enabled |
| Prettier | Project-wide config; integrated with ESLint |
| Commit linting | `commitlint` + `husky` enforcing conventional commits |
| Tests | Vitest + React Testing Library for unit tests; Playwright for E2E on hero flows |
| CI | GitHub Actions: typecheck, lint, test, build on every PR; Vercel preview deploys |
| Quality gates | Lighthouse CI budgets: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 on landing |

## 9. Testing strategy

- **Unit (Vitest + RTL):** data-layer functions, role-aware filtering, form validation schemas, PDF template rendering, i18n fallback behavior.
- **Component:** shared demo primitives (`<DemoReadOnly>`, `<RoleSwitcher>`).
- **E2E (Playwright):** three hero flows run in CI on PR:
  1. Enroll a student in a course.
  2. Grade a course and persist the grade across a reload.
  3. Generate a certificate and assert the PDF downloads.
- **No E2E coverage** for Tier 2 or Tier 3 modules in v1. Unit coverage is sufficient given the restricted surface area.

## 10. Error handling & edge cases

- Global `<ErrorBoundary>` with a friendly fallback UI and a "Reset demo data" escape hatch.
- Every async surface renders three states: empty, loading skeleton, error with retry.
- Dedicated 404 page styled to match the app.
- Offline-friendly by construction (static assets + localStorage).
- First-visit `<DemoBanner>` explains the demo scope and the data-reset behavior; dismissable with its choice persisted.

## 11. Hosting & deployment

- Vercel (Hobby tier). Free, no sleep, integrated preview deploys.
- Custom domain if the user owns one; otherwise `fundavida.vercel.app`.
- Vercel Analytics enabled (anonymous).
- `main` branch → production; every PR → preview deploy with a comment linking to the URL.

## 12. Repository strategy

- Old repo (`rjwrld/FundaVida`) is renamed (suggested: `FundaVida-original`) and made private or archived. The original Supabase-based code is preserved there for reference.
- A new public repository named `FundaVida` is created and seeded from scratch. No history is imported.
- `main` branch is protected; every change lands through a PR, even though work is solo. The PR list is the portfolio artifact.
- First PRs scaffold tooling (strict TS, ESLint, Prettier, Vitest, Playwright, CI) before any feature code lands, so the quality gates bite from commit 1.
- Target PR count: 15–18, each under ~400 lines of diff where feasible, with conventional-commit titles and descriptions that a reviewer can understand cold.

## 13. Deliberately excluded

- Real auth, passwords, sessions, OAuth.
- Any backend service (Supabase, Firebase, Convex, Appwrite, custom API).
- Email sending (Resend or otherwise).
- Server-rendered PDF generation.
- Analytics beyond Vercel's anonymous metrics.
- PWA, service workers, offline sync beyond localStorage.
- Complete i18n coverage of Tier 3 modules in v1.
- Tests for Tier 3 modules in v1.

## 14. Success criteria

A recruiter opens the demo URL, sees a professional marketing-style landing page, enters as "Admin", browses three to four screens, exercises one hero flow (enrollment, grading, or certificate generation), and closes the tab impressed — all within 90 seconds and with zero observable bugs.

In addition:

- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 on the landing page.
- Repository: 15+ clean PRs visible on `main`, green CI badge, README with screenshots and an architecture section.
- Codebase: zero `any` types, zero disabled ESLint rules, zero skipped tests.

## 15. Open items deferred to the implementation plan

- Concrete PR sequence, diff-size estimates, and branching cadence.
- Exact Zustand slice boundaries and selector patterns.
- Specific Lighthouse remediation steps if the initial audit falls short.
- README structure and screenshot capture workflow.
- Domain name decision (custom vs. `vercel.app` subdomain).
