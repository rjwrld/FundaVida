# Phase 6 — i18n EN/ES Design Spec

**Date:** 2026-04-22
**Status:** Approved (pending user review of this file)
**Prerequisite:** Phase 5b merged (PR #30 + phase 5b cleanup).

## 1. Goal

Make FundaVida a fully bilingual (English / Spanish) demo application. Every user-visible string, form validation message, nav label, and formatted value (dates, numbers, percentages, grades) must render in the active locale. Users toggle language from the landing page and the app header; the choice persists across reloads via the existing Zustand + `localStorage` snapshot.

## 2. Non-goals

- Right-to-left layout support.
- Additional languages beyond EN / ES.
- Server-side language negotiation (this is a client-only Vite SPA).
- Translator-review tooling beyond what `i18next-parser` provides.
- Marketing copy rewrites — strings are translated, not redesigned.
- Landing polish, deploy, Lighthouse — those remain Phase 7.

## 3. Decisions and rationale

| #   | Decision                                                                                   | Rationale                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use `react-i18next` (~20 KB gz) over `@lingui/react` or a custom `t()`                     | Industry default, zero Vite/SWC config, `Intl`-based plurals free. Bundle cost invisible next to React. Demonstrates reaching for the standard on a portfolio piece.                            |
| D2  | Manual wrap per-module + `i18next-parser` CI gate                                          | Preserves Phase 5a/5b vertical-slice rhythm; prevents EN/ES drift; missing-key lint fails CI so screenshots stay clean. Codemod-first approach produces un-reviewable diffs and auto-key names. |
| D3  | Locale slice lives in the existing Zustand store                                           | Single source of truth — reuses `src/data/persistence.ts`, validates with Zod, clears with "Reset demo". Avoids the dual-source trap of `i18next-browser-languagedetector`.                     |
| D4  | Language toggle renders in both `AppHeader` and `LandingPage` (top-right)                  | Landing is the first thing reviewers see; EN-only landing next to a bilingual app is the one visible seam. Same component, `variant` prop for styling.                                          |
| D5  | `src/lib/format.ts` wraps `Intl.DateTimeFormat` / `Intl.NumberFormat` behind `useFormat()` | Audit timestamps, grades, percentages, TCU hours all pass through one module — testable without rendering; future format changes are one-file edits.                                            |
| D6  | Task 1 ships the tracer-bullet slice (infra + shell + landing only)                        | Proves library, parser CI, Zustand slice, persistence, both toggles, formatting, unit tests, and e2e before touching 12 domain modules. Matches Phase 5a Task 1's pattern.                      |
| D7  | Zod schema messages translated via `buildSchemas(t)` factory                               | Keeps schemas co-located with their feature, re-evaluates on locale change without requiring React Query invalidation.                                                                          |

## 4. Architecture

```
src/
├── lib/
│   ├── i18n.ts              # i18next init + Zustand subscription + <I18nProvider>
│   └── format.ts            # formatDate / formatNumber / formatPercent / formatGrade
├── hooks/
│   └── useFormat.ts         # locale-bound format helpers
├── locales/
│   ├── en.json              # namespaced: common, nav, landing, ...
│   └── es.json
├── components/
│   └── layout/
│       └── LanguageToggle.tsx   # variant: 'header' | 'landing'
├── data/
│   ├── store.ts             # + locale slice, setLocale()
│   ├── persistence.ts       # + locale in SeedSnapshot Zod schema
│   └── schemas/*.ts         # exported as buildX(t) factories
i18next-parser.config.js     # extraction / validation config
```

### Boot sequence

1. `src/main.tsx` imports `./lib/i18n` (side-effect init) and wraps `<App />` in `<I18nProvider>`.
2. `i18n.ts` subscribes to Zustand's `locale` slice — which hydrated from `localStorage` synchronously during store creation (same pattern as `role`).
3. Initial language priority: persisted store value → `navigator.language.startsWith('es') ? 'es' : 'en'` → `'en'`.
4. Resource bundles are bundled via `import en from '@/locales/en.json'` — no async fetch, so `<Suspense>` inside `<I18nProvider>` resolves on first render.

### Language switch flow

```
Click LanguageToggle
  → store.setLocale('es')
  → Zustand subscribers fire
    → persistence.ts debounced writer saves snapshot
    → i18n.ts subscriber calls i18n.changeLanguage('es')
  → react-i18next re-renders every useTranslation() / <Trans> consumer
  → useFormat() returns new locale-bound helpers
  → forms rebuild Zod schemas via buildSchemas(t) on next render
```

## 5. Component surface

### New files

| File                                         | Purpose                                              |
| -------------------------------------------- | ---------------------------------------------------- |
| `src/lib/i18n.ts`                            | `initI18n()`, `<I18nProvider>`, Zustand subscription |
| `src/lib/format.ts`                          | Pure `Intl` wrappers, no React                       |
| `src/hooks/useFormat.ts`                     | Binds format helpers to active locale                |
| `src/components/layout/LanguageToggle.tsx`   | `EN \| ES` segmented control; `variant` prop         |
| `src/locales/en.json`, `src/locales/es.json` | Namespaced dictionaries                              |
| `i18next-parser.config.js`                   | Extraction config (scans `src/**/*.{ts,tsx}`)        |
| `src/lib/__tests__/format.test.ts`           | Vitest coverage of `Intl` wrappers                   |
| `src/lib/__tests__/i18n.test.ts`             | Fallback key, locale switch re-render, hydration     |
| `e2e/i18n.spec.ts`                           | Landing + dashboard toggle, reload persistence       |

### Modified files

| File                                     | Change                                                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/store.ts`                      | Add `locale: 'en' \| 'es'`, `setLocale()`, include in `resetDemo`                                                                                                                            |
| `src/data/persistence.ts`                | Add `LOCALE_KEY = 'fundavida:v1:locale'` with `loadPersistedLocale` / `savePersistedLocale` / `clearPersistedLocale` helpers, following the existing `ROLE_KEY` / `CURRENT_USER_KEY` pattern |
| `src/data/schemas/*.ts`                  | Export `buildX(t)` factories; existing callers pass `t` from `useTranslation`                                                                                                                |
| `src/main.tsx`                           | Wrap `<App />` in `<I18nProvider>`                                                                                                                                                           |
| `src/components/layout/AppHeader.tsx`    | Mount `<LanguageToggle variant="header" />`                                                                                                                                                  |
| `src/pages/LandingPage.tsx`              | Mount `<LanguageToggle variant="landing" />` top-right                                                                                                                                       |
| `src/constants/nav.ts`                   | Replace `label: string` with `labelKey: string`; sidebar reads via `t()`                                                                                                                     |
| All pages under `src/pages/**`           | Wrap literals in `t()` over Tasks 2-4                                                                                                                                                        |
| All components under `src/components/**` | Wrap literals in `t()` over Tasks 2-4                                                                                                                                                        |
| `package.json`                           | Add deps + `i18n:extract`, `i18n:check` scripts                                                                                                                                              |

## 6. Dictionary conventions

### Namespace layout

```
common    — shared buttons, labels (Cancel, Save, Delete, Search, ...)
nav       — sidebar labels, header items
landing   — landing page copy
dashboard — dashboard widgets + empty states
students / teachers / courses / enrollments / grades
certificates / tcu / attendance / reports / auditLog / bulkEmail
                                             # module-level
validation — Zod error messages (required, email, min, max, ...)
errors     — runtime surfaces (reset-demo confirm, 404, ...)
```

### Key style

- Dot-separated: `students.list.title`, `common.actions.cancel`, `validation.required`.
- Lower camelCase within a segment.
- Pluralization via i18next's suffix: `{ "courses.count_one": "{{count}} course", "courses.count_other": "{{count}} courses" }` (EN and ES both map to `one` / `other` categories).
- Interpolation: `"{{name}}"` — never string concatenation in calling code.

### JSON file shape

```json
{
  "common": {
    "actions": { "save": "Save", "cancel": "Cancel" }
  },
  "students": {
    "list": { "title": "Students", "empty": "No students yet." }
  }
}
```

## 7. Formatting rules

All via `src/lib/format.ts`; no component imports `Intl` directly.

| Helper                           | Locale behaviour                                                             | Used by                                 |
| -------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| `formatDate(iso, locale)`        | `DateTimeFormat(locale, { year:'numeric', month:'short', day:'numeric' })`   | Audit log, enrollment dates, attendance |
| `formatDateTime(iso, locale)`    | As above + `hour:'2-digit', minute:'2-digit'`                                | Audit log timestamps                    |
| `formatNumber(n, locale, opts?)` | `NumberFormat(locale, opts)`                                                 | TCU hours, totals                       |
| `formatPercent(n, locale)`       | `NumberFormat(locale, { style:'percent', maximumFractionDigits:1 })`         | Attendance rate, present rate           |
| `formatGrade(n, locale)`         | `NumberFormat(locale, { minimumFractionDigits:1, maximumFractionDigits:1 })` | Grade averages (0-100 scale retained)   |

## 8. Error handling

### Missing translation keys

- i18next config: `fallbackLng: 'en'`, `returnEmptyString: false`, `saveMissing: true` (dev only).
- CI step: `npm run i18n:check` runs `i18next-parser --fail-on-warnings` — any key used in code that is absent from `en.json` _or_ `es.json` fails the PR.
- Production runtime: missing key falls back to the EN value; if EN is also missing, the raw key string renders (obvious visual signal).

### Malformed persisted locale

- `loadPersistedLocale` returns `null` when the stored value is anything other than `'en'` or `'es'` (matches the `loadPersistedRole` pattern).
- Null from `loadPersistedLocale` triggers the `navigator.language.startsWith('es') ? 'es' : 'en'` fallback, then `'en'`.

### Form validation

- `buildSchemas(t)` rebuilds on every `useTranslation()`-caused render; forms using `zodResolver(buildStudentSchema(t))` get live-translated messages.
- No React Query invalidation needed — RHF re-validates on submit, which happens after the render cycle that switched locale.

## 9. Testing strategy

### Vitest (unit)

- `format.test.ts` — EN + ES output for each helper at representative values. Assert against real `Intl` output (snapshot-style) rather than hand-coded strings to stay robust across Node versions.
- `i18n.test.ts` — fallback when ES key missing; `renderHook(useTranslation)` picks up locale change; persisted locale survives synthesised hydration.
- Per-task component smoke: one representative page wrapped in both locales, asserts a Spanish-specific string is visible after toggle.

### Playwright (e2e)

- `e2e/i18n.spec.ts` — Task 1:
  1. Visit `/` → header shows "Get started" (EN).
  2. Click landing toggle → "ES" active → copy becomes Spanish.
  3. Reload → still Spanish.
  4. Enter app as admin → dashboard in ES.
  5. Header toggle → EN → reload → still EN.
- Extended per task: Task 2 adds `students.spec.ts` locale assertion, etc. Keep assertions narrow (one ES-specific string per module) to avoid fragile e2e.

### CI wiring

- `npm run i18n:check` added to the existing gauntlet (`typecheck → lint → test → i18n:check → e2e → build`). Added to `package.json` _and_ the CI workflow in Task 1 — the check must be green from the first PR forward so later modules can't regress it silently.

## 10. Migration and persistence

- Locale is stored under its _own_ localStorage key (`fundavida:v1:locale`), separate from `SeedSnapshot`. Existing persisted state snapshots keep loading cleanly; visitors who had the app before Phase 6 simply get the `navigator.language`-based initial choice on their next visit.
- **"Reset demo" does _not_ clear the locale key.** Flipping a ES user's UI to EN mid-session would be disorienting. Locale is a UI preference, not demo state — it survives `resetDemo()` just like browser theme preferences would.
- Nothing else migrates — dictionaries are compiled into the bundle; there are no stored translation overrides to version.

## 11. Task outline (4 + cleanup, one PR each)

| Task                        | Branch                  | Deliverable                                                                                                                                                                                                               |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Infra + shell + landing | `feat/i18n-infra`       | react-i18next + i18next-parser wired, Zustand locale slice, `<I18nProvider>`, `<LanguageToggle>` (both variants), `format.ts` + `useFormat`, landing + layout + nav + demo banner wrapped, `e2e/i18n.spec.ts`, unit tests |
| 2 — Tier 1 modules          | `feat/i18n-tier-1`      | Students, Teachers, Courses, Enrollments — all pages/forms/dialogs wrapped, Zod schemas translated via `buildSchemas(t)`                                                                                                  |
| 3 — Tier 2 modules          | `feat/i18n-tier-2`      | Grades, Certificates, TCU, Attendance                                                                                                                                                                                     |
| 4 — Tier 3 modules          | `feat/i18n-tier-3`      | Reports, Audit Logs, Bulk Email, Dashboard, NotFoundPage                                                                                                                                                                  |
| 5 — Cleanup                 | `chore/phase-6-cleanup` | Holistic review agent, missing-key sweep across the merged work, any reviewer-flagged Important fixes. Skip if zero findings.                                                                                             |

Each task = one branch → one PR → one merge into `main`. Conventional commits, lowercase-first imperative. **No `Co-Authored-By: Claude` trailers. No "Generated with Claude Code" footers.** Each task runs the full gauntlet (`typecheck`, `lint`, `test`, `i18n:check`, `e2e`, `build`) before PR.

## 12. Exit criteria

When Tasks 1-4 (and optionally 5) are merged:

- Visitor lands on `/`, toggles ES, sees Spanish hero copy, reloads, still Spanish.
- Admin enters `/app`, every sidebar item, page title, button label, empty state, form field label, validation message, and audit timestamp renders in the active locale.
- `npm run i18n:check` passes cleanly on `main`; zero `saveMissing` warnings in dev build.
- Unit test count grows by roughly 10-15 (format + i18n + schema-factory smoke).
- E2E grows by one spec (`i18n.spec.ts`) plus per-task module assertions.
- Repo at 35-36 merged PRs on `main`, all conventional-commit, no Claude attribution.

## 13. Deferred to later phases

- Landing marketing polish, README screenshots in both locales, live demo URL, Vercel deploy, Lighthouse CI — Phase 7.
- A third locale (pt-BR, fr, …) — would require revisiting the plural-category assumption but nothing else in this design blocks it.
- In-app translator-override UI (editing strings at runtime) — not needed for a portfolio demo.
- Date-picker localization beyond `Intl` defaults — out of scope until a date picker is actually introduced.
