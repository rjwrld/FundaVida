# Phase 7 — Portfolio Polish and Deploy Design Spec

**Date:** 2026-04-23
**Status:** Approved (pending user review of this file)
**Prerequisite:** Phase 6 cleanup merged (PR #38).

## 1. Goal

Make FundaVida LinkedIn-shareable. A recruiter follows a link from your profile, lands on a polished marketing page that explains what the project is in under ten seconds, clicks into the demo, and (if curious) reads a README that documents the rearchitecture with auto-generated bilingual screenshots. Production hosting is a live Vercel URL; every PR runs Lighthouse and reports scores as a soft gate.

## 2. Non-goals

- Custom domain (stay on the Vercel-assigned `.vercel.app` subdomain).
- Full Spanish README mirror (`README.es.md`) — only a collapsed ES summary block inside the English README.
- Hard Lighthouse gate (soft fail only — thresholds report red but don't block merge).
- Certificate PDF body translation (still deferred per Phase 6).
- New feature work, bug fixes outside the polish surface, or module rewrites.
- Animated landing video / Lottie / 3D hero — one static hero screenshot only; no motion beyond the existing language-toggle transition.
- Server-side rendering, SSG, or Next.js migration. App stays a Vite SPA.
- README translation tooling (Crowdin, Weblate, etc.). The ES block is hand-maintained.

## 3. Decisions and rationale

| #   | Decision                                                                                                                                                                                                                                                   | Rationale                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Landing page expanded to five sections (hero / role cards / feature preview / tech stack / footer) instead of the current hero + role cards                                                                                                                | Recruiters scan above the fold first. A static hero screenshot plus three feature cards sells module depth in two scrolls without adding motion maintenance.                                                                                      |
| D2  | Playwright-driven screenshot pipeline (`scripts/screenshots.ts`) committed to `public/screenshots/*.{en,es}.png`                                                                                                                                           | Screenshots regenerate from the app, not from manual captures — they never drift when UI shifts. Reuses existing Playwright infra; "our own CI makes our marketing images" is itself a signal.                                                    |
| D3  | 3 flows × 2 locales = 6 screenshots; README embeds the EN set + one EN/ES pair                                                                                                                                                                             | Three flows (Students list, Certificate preview, Reports dashboard) map onto the Tier 1 hero modules in the portfolio design spec. The EN/ES pair makes the Phase 6 i18n investment visible in two seconds of README scroll.                      |
| D4  | README is English primary with a collapsed `<details>` Spanish section at the bottom (not a separate `README.es.md`)                                                                                                                                       | Global recruiters expect English on GitHub. The ES `<details>` block honors the org's language and preserves the "Sobre FundaVida" warmth of the old README without doubling upkeep. Trivial upgrade path to full `README.es.md` later if wanted. |
| D5  | New README borrows the shape of the pre-rearchitecture `/Users/rj/Dev/projects/personal/FundaVida-old-ref/README.md` (tech table, feature sections, author block, closing quote) and explicitly contrasts it via a "rearchitected from production" callout | Readers who know the original context see the delta (Supabase / Auth / RLS → localStorage / role-switcher / in-browser). New readers get a portfolio narrative instead of a feature-list dump.                                                    |
| D6  | Vercel production deploy wired from scratch via `vercel link` — default `.vercel.app` subdomain, no custom domain                                                                                                                                          | `vercel.json` already has the SPA rewrite but no Vercel project is connected. Default subdomain is recruiter-standard at zero cost. Custom domain is a 10-minute DNS tweak later if wanted.                                                       |
| D7  | Vercel Analytics enabled (already approved in original design spec §6.1)                                                                                                                                                                                   | Anonymous, GDPR-friendly, free on hobby tier. Shows "measuring traffic" without tracker detritus.                                                                                                                                                 |
| D8  | Lighthouse CI as a non-required GitHub status check via `treosh/lighthouse-ci-action@v12` running against the Vercel preview URL                                                                                                                           | Soft gate posts scores as a PR comment and fails the Lighthouse job on threshold breach without blocking merge. Solo portfolio repo — no multi-dev pressure needs a hard gate. Can harden to required check later.                                |
| D9  | Thresholds: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95                                                                                                                                                                            | Achievable numbers for a Vite SPA with Tailwind + shadcn. A11y/BP/SEO ≥ 95 are realistic given Phase 1-6 discipline (semantic HTML, aria-labels, meta tags). Performance ≥ 90 leaves headroom for LCP variance.                                   |
| D10 | OG / Twitter meta tags + committed `public/og-image.png` (1200×630 PNG captured by the screenshot script)                                                                                                                                                  | When the Vercel URL is pasted into LinkedIn/Slack/Twitter, a rich preview card renders. ~15 lines of meta tags + one regenerated image. The OG image uses the landing hero screenshot so marketing copy stays in one place.                       |
| D11 | `npm run screenshots` is manually run, not wired into CI                                                                                                                                                                                                   | Determinism depends on seed snapshot state; running in CI on every push would bloat commits and slow the verify job. Developer regenerates on demand when UI shifts; a `docs/superpowers/` note reminds to do so.                                 |
| D12 | `.claude/` added to `.gitignore` as part of Phase 7 hygiene (no dedicated cleanup task)                                                                                                                                                                    | Currently untracked but not ignored — one careless `git add .` leaks local plugin settings. Folds into Task 3's README rewrite commit; separate cleanup task for a one-line change would be ceremony.                                             |

## 4. Architecture

### 4.1 Landing page shape

```
┌──────────────────────────────────────────────────────────┐
│ Hero                                                     │
│  ┌────────────────────┐  ┌──────────────────────────┐    │
│  │ title              │  │                          │    │
│  │ subtitle           │  │  hero screenshot.png     │    │
│  │ [Enter demo] CTA   │  │  (dashboard or students) │    │
│  │                    │  │                          │    │
│  └────────────────────┘  └──────────────────────────┘    │
│                              LanguageToggle (top-right)  │
├──────────────────────────────────────────────────────────┤
│ Role cards — existing 4-card grid (unchanged layout)     │
├──────────────────────────────────────────────────────────┤
│ Feature preview — 3 cards, each with screenshot + caption│
│   Students CRUD | Certificate PDF | Reports dashboard    │
├──────────────────────────────────────────────────────────┤
│ Tech stack badge row                                     │
│   React · TypeScript · Vite · Tailwind · shadcn/ui ·     │
│   Zustand · React Query · Playwright · Vitest            │
├──────────────────────────────────────────────────────────┤
│ Footer                                                   │
│   Rearchitected portfolio demo of FundaVida • LinkedIn • │
│   GitHub repo • FundaVida org                            │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Screenshot pipeline

```
scripts/screenshots.ts          # Plain TS script using @playwright/test's chromium API
                                # (not a Playwright test file — run via `tsx`, not `playwright test`)
  ├─ launches dev server (npm run dev → wait for ready)
  ├─ navigates for each (flow, locale) combination
  ├─ sets Zustand locale via LanguageToggle click
  ├─ takes deterministic clip screenshot
  └─ writes to public/screenshots/{flow}.{locale}.png

public/screenshots/
  ├─ hero.en.png                  # 1440×900 landing hero (admin dashboard view)
  ├─ students.en.png              # 1440×900 list view
  ├─ students.es.png
  ├─ certificate.en.png           # 1200×800 certificate preview dialog
  ├─ certificate.es.png
  ├─ reports.en.png               # 1440×900 reports dashboard
  └─ reports.es.png

public/og-image.png               # 1200×630 social preview (separate crop)
```

Six flow screenshots + one hero + one OG image = 8 PNGs total (~2-3 MB uncompressed, comfortably under GitHub's README image size limits).

### 4.3 Vercel deploy

- `vercel link` connects local repo to a new hobby-tier Vercel project
- Production branch = `main`; preview deploys on every PR
- Build command: `npm run build` (already configured)
- Output directory: `dist/` (Vite default)
- `vercel.json` stays as-is (SPA rewrite, already committed)
- Vercel Analytics enabled via the project dashboard (no SDK changes)
- The production URL (`https://fundavida-<hash>.vercel.app` or whatever Vercel assigns) gets surfaced in:
  - README top badge
  - Landing page footer
  - GitHub repo description / website field (manual edit in GitHub UI)

### 4.4 Lighthouse CI

```
.github/workflows/lighthouse.yml
  ├─ trigger: pull_request against main
  ├─ needs: verify + e2e from ci.yml
  ├─ waits for Vercel preview to be ready
  │   (poll deployment status API until state === 'READY')
  ├─ runs treosh/lighthouse-ci-action@v12 against the preview URL
  ├─ thresholds: perf=0.9, a11y=0.95, bp=0.95, seo=0.95
  └─ posts scores as PR comment
```

The job is a non-required check in branch protection — it reports red on threshold breach but doesn't block merge.

### 4.5 README anatomy

```
README.md
├─ Header: title + one-line tagline + live-demo badge + CI badges (verify / playwright / lighthouse)
├─ Rearchitecture callout
│   "FundaVida was a production educational-management platform built with
│    React + Supabase. This repository is a portfolio rearchitecture: all data
│    runs in your browser via localStorage; no backend, no auth, no secrets."
│   Delta table (production → portfolio demo):
│     Auth: Supabase Auth + RLS → role switcher
│     DB: PostgreSQL + Storage → Zustand + localStorage
│     Email: Resend → simulated (logged to audit trail)
│     Deploy: Vercel + Supabase → Vercel only
├─ Live demo section (link + GIF or hero screenshot)
├─ Stack table — current stack, matches shape of old README's Spanish table
├─ Features by tier (Tier 1 hero / Tier 2 supporting / Tier 3 read-only showcase)
├─ Screenshots section (EN set + one EN/ES pair for the bilingual callout)
├─ Getting started: clone → npm i → npm run dev (no .env needed)
├─ Scripts table — current npm scripts
├─ Project structure tree (src/ overview)
├─ Phase history: links to docs/superpowers/{specs,plans} + merged PRs summary
├─ Author block: LinkedIn + GitHub + one-line bio
└─ <details> Sobre FundaVida (ES)
     Condensed "about the org + mission + programs" block from the old README,
     collapsed by default, Spanish only.
```

## 5. Component surface

### New files

| File                                                       | Purpose                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/components/landing/FeaturePreview.tsx`                | Three-card feature preview grid (data-driven from a `features` array) |
| `src/components/landing/TechStack.tsx`                     | Tech badge row (static SVG/span list; no external badge image deps)   |
| `src/components/landing/LandingFooter.tsx`                 | Landing footer with org / LinkedIn / repo links                       |
| `src/components/landing/HeroScreenshot.tsx`                | Wraps the hero `<img>` with responsive srcset, alt text from `t()`    |
| `src/components/landing/__tests__/FeaturePreview.test.tsx` | Smoke — renders three cards, all captions translated                  |
| `src/components/landing/__tests__/LandingFooter.test.tsx`  | Smoke — links rendered, external targets have `rel="noopener"`        |
| `scripts/screenshots.ts`                                   | Playwright script that captures 6 flow PNGs + 1 OG PNG                |
| `public/screenshots/hero.en.png`                           | 1440×900 admin dashboard hero used by landing `HeroScreenshot`        |
| `public/screenshots/students.{en,es}.png`                  | Students list screenshot (both locales)                               |
| `public/screenshots/certificate.{en,es}.png`               | Certificate preview dialog screenshot (both locales)                  |
| `public/screenshots/reports.{en,es}.png`                   | Reports dashboard screenshot (both locales)                           |
| `public/og-image.png`                                      | 1200×630 social preview card (separate crop from hero)                |
| `.github/workflows/lighthouse.yml`                         | Lighthouse CI workflow                                                |
| `.github/lighthouse-budget.json`                           | LHCI config with threshold assertions                                 |

### Modified files

| File                        | Change                                                                                                           | Task |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| `src/pages/LandingPage.tsx` | Insert hero screenshot, feature preview, tech stack, footer between existing hero and role cards / at end        | 1    |
| `index.html`                | Add OG + Twitter meta tags; update title if needed                                                               | 1    |
| `src/locales/en.json`       | New `landing.hero.*`, `landing.featurePreview.*`, `landing.techStack.*`, `landing.footer.*` keys (~15 leaf keys) | 1    |
| `src/locales/es.json`       | Same keys, ES values                                                                                             | 1    |
| `package.json`              | Add `"screenshots": "tsx scripts/screenshots.ts"` script; add `tsx` to devDependencies                           | 2    |
| `playwright.config.ts`      | No change (the script uses `@playwright/test`'s `chromium` API directly, not the test runner)                    | 2    |
| `README.md`                 | Full rewrite per §4.5                                                                                            | 3    |
| `.gitignore`                | Add `.claude/` entry                                                                                             | 3    |
| `vercel.json`               | No change (rewrite already present) — verify only                                                                | 4    |
| `.github/workflows/ci.yml`  | No change (Lighthouse goes in its own workflow to keep job matrices separate)                                    | 5    |

### Spec coverage map

| Spec section                | Task(s)       |
| --------------------------- | ------------- |
| §4.1 Landing shape          | Task 1        |
| §4.2 Screenshot pipeline    | Task 2        |
| §4.3 Vercel deploy          | Task 4        |
| §4.4 Lighthouse CI          | Task 5        |
| §4.5 README anatomy         | Task 3        |
| §5 New component files      | Tasks 1, 2, 5 |
| §6 Copy / content           | Tasks 1, 3    |
| §7 Formatting / badge style | Task 1        |
| §8 Error handling           | Task 5        |
| §9 Testing strategy         | Tasks 1, 2    |
| §10 Rollout / tasks         | All tasks     |

## 6. Copy and content conventions

### Landing page new copy (EN, naturalized ES counterparts in `es.json`)

| Key                                          | EN                                                                                                 | Notes                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `landing.hero.tagline`                       | "Educational management platform — rearchitected as a browser-only portfolio demo"                 | One sentence, under 80 chars ideally (OG description constraint) |
| `landing.hero.cta`                           | "Enter demo"                                                                                       | Primary CTA above the fold                                       |
| `landing.hero.screenshotAlt`                 | "Dashboard preview with student and course statistics"                                             | Alt text for the hero image; must translate                      |
| `landing.featurePreview.heading`             | "A taste of what's inside"                                                                         | Section H2                                                       |
| `landing.featurePreview.students.title`      | "Full-CRUD students module"                                                                        | Card title                                                       |
| `landing.featurePreview.students.caption`    | "Create, filter, search, edit, and delete. Form validation, optimistic updates, and keyboard nav." | Card body copy                                                   |
| `landing.featurePreview.certificate.title`   | "Certificate PDF generation"                                                                       |                                                                  |
| `landing.featurePreview.certificate.caption` | "Eligible students earn a PDF certificate rendered in-browser via @react-pdf/renderer."            |                                                                  |
| `landing.featurePreview.reports.title`       | "Cross-cutting reports"                                                                            |                                                                  |
| `landing.featurePreview.reports.caption`     | "Enrollments, average grades, attendance rates, and community hours — all computed client-side."   |                                                                  |
| `landing.techStack.heading`                  | "Built with"                                                                                       | Section H2                                                       |
| `landing.footer.rearchitected`               | "Rearchitected portfolio demo of {{org}}"                                                          | `{{org}}` interpolates `FundaVida` (no translation)              |
| `landing.footer.linkedin`                    | "LinkedIn"                                                                                         |                                                                  |
| `landing.footer.github`                      | "Source"                                                                                           | Rather than "GitHub" — brand-agnostic                            |
| `landing.footer.org`                         | "FundaVida org"                                                                                    |                                                                  |

All keys go in both `en.json` and `es.json`. Run `npm run i18n:check` after the Task 1 commit.

### README callout wording

The "rearchitected from production" block uses a two-column delta table rather than prose. Keeps the narrative concrete and skimmable:

```
| Production (original)      | Portfolio demo (this repo)          |
| -------------------------- | ----------------------------------- |
| Supabase Auth + RLS        | Role switcher (no login)            |
| PostgreSQL + Storage       | Zustand + localStorage              |
| Resend email delivery      | Simulated (logged to audit trail)   |
| Vercel + Supabase hosting  | Vercel only                         |
```

### Tech stack badge style

Use **static text badges** (span with border + monospace font + Tailwind classes), not third-party SVG badge services (`shields.io`), to stay zero-dependency at runtime and avoid load-time requests. README can use shields.io badges for build status since those render on GitHub's image proxy.

## 7. Formatting and style rules

- Hero screenshot (`hero.en.png`): 1440×900 PNG, cropped from the admin dashboard view in EN.
- OG image (`og-image.png`): 1200×630 PNG, separate crop optimized for Facebook/LinkedIn/Twitter preview cards. Captured by the same `scripts/screenshots.ts` run.
- Feature preview screenshots: 800×500 PNGs, same seed state, same admin role.
- Certificate preview screenshot is the PDF dialog open, cropped to the dialog container.
- All screenshots captured at 2× DPR for retina clarity; file size stays tolerable because they're PNGs of a mostly-flat UI. Compressed via lossless `pngquant` or similar if any file exceeds 300 KB.
- OG meta tags: `og:type=website`, `og:image` = absolute URL to `/og-image.png`, `og:title` = `"FundaVida"`, `og:description` = the `landing.hero.tagline` EN value.
- Twitter meta tags mirror OG: `twitter:card=summary_large_image`, `twitter:image`, `twitter:title`, `twitter:description`.

## 8. Error handling

- If Playwright fails to load the dev server in `scripts/screenshots.ts`, the script exits non-zero. The developer re-runs after fixing. No fallback placeholder screenshots — missing files should make the README visibly broken in review, not silently gray-boxed.
- Lighthouse CI posting the PR comment requires `pull-requests: write` permissions. Workflow declares this explicitly; if the token is misconfigured the job logs a clear error and still runs the audit (comment posting is a nice-to-have, not a gate).
- Vercel preview URL polling in the Lighthouse workflow has a 5-minute timeout. If the preview isn't ready in that window, the Lighthouse job fails with a clear "preview not ready" message rather than hanging.
- If `og-image.png` is missing at deploy time, the build still succeeds but social previews fall back to no image. Screenshot script asserts all 7 PNGs exist before exiting 0.

## 9. Testing strategy

### Unit (Vitest)

- `FeaturePreview.test.tsx` — renders three cards, each card reads its title/caption from the dictionary, image alt text is translated.
- `LandingFooter.test.tsx` — renders expected link set, external links have `target="_blank" rel="noopener noreferrer"`.

### E2E (Playwright)

- Extend existing `e2e/i18n.spec.ts` with an assertion that the new landing sections render in both locales (one spec run, no new file).
- No new e2e test for the screenshot script itself — the script IS the Playwright code, and its determinism is verified by running `npm run screenshots` twice and diffing output (dev workflow, not CI).

### Lighthouse

- Budget config in `.github/lighthouse-budget.json` enforces the §3 D9 thresholds.
- Scores surface in PR comment via LHCI's built-in comment action.

### Visual regression

- Explicitly out of scope. Screenshot pipeline is for README/landing marketing, not for asserting pixel parity.

## 10. Rollout — tasks

| Task | Branch                                | Summary                                                                                                                                  | Est. size                 |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1    | `feat/phase-7-landing-polish`         | Hero screenshot slot, FeaturePreview / TechStack / LandingFooter components, new dictionary keys, OG + Twitter meta tags in `index.html` | ~400 LOC                  |
| 2    | `feat/phase-7-screenshots`            | `scripts/screenshots.ts` + `npm run screenshots` + initial 7-PNG commit (6 flows + 1 OG)                                                 | ~200 LOC + assets         |
| 3    | `docs/phase-7-readme`                 | Full README rewrite + `.claude/` added to `.gitignore`                                                                                   | ~300 lines of MD          |
| 4    | `chore/phase-7-vercel-deploy`         | `vercel link`, production + preview deploys verified, URL + badges added to README + landing footer                                      | ~30 LOC (README + footer) |
| 5    | `chore/phase-7-lighthouse`            | `.github/workflows/lighthouse.yml`, `.github/lighthouse-budget.json`, badge in README                                                    | ~80 LOC                   |
| 6    | `chore/phase-7-cleanup` (conditional) | Only if a final cross-cutting review finds Important+ items                                                                              | varies                    |

Each task → one branch → one PR → one merge into `main`. Same Phase 5 / Phase 6 rhythm.

## 11. Migration and persistence

- Tasks 1-3 are additive — no breaking changes to existing storage, routes, or public APIs.
- Task 4 (Vercel) creates external state (the Vercel project) that isn't represented in the repo. The project ID is written to `.vercel/project.json`, which Vercel's `.gitignore` template excludes by default — verify it doesn't get committed.
- Task 5 (Lighthouse) only adds workflow + config files; no persistence concerns.
- No user-facing data migration. The `resetDemo()` flow continues to behave identically.

## 12. Exit criteria

When Tasks 1-5 (and optionally 6) are merged:

- Landing page renders the five sections in both EN and ES. All new copy passes `npm run i18n:check`.
- `npm run screenshots` regenerates all 8 PNGs from a clean checkout. Reruns are visually identical to committed versions (seed data is deterministic; font rendering may produce minor sub-pixel differences).
- `README.md` reads cleanly top-to-bottom in English. The `<details>` Spanish section expands to the mission block. Both the live-demo badge and Lighthouse badge resolve.
- Production URL is reachable at `https://<project>.vercel.app`. Every PR posts a preview URL; Vercel Analytics is collecting.
- Every PR shows a Lighthouse job status with scores commented; failures below threshold turn the check red but do not block merge.
- Pasting the production URL into LinkedIn, Slack, or Twitter renders a rich preview card with the hero image.
- Conventional commits on every branch. No `Co-Authored-By: Claude` trailers, no "Generated with Claude Code" / 🤖 footers.
- Repo at 42-44 merged PRs on `main`, all conventional-commit, all green on CI.

## 13. Deferred to later phases

- Custom domain + DNS configuration (10-minute upgrade when needed).
- Full `README.es.md` mirror — trivial to lift the `<details>` section into a standalone file later.
- Hard Lighthouse gate as a required status check — upgrade once scores are stable for a few weeks.
- Visual regression testing (Chromatic, Percy, etc.) — portfolio-grade overhead for a solo repo.
- E2E assertions on Lighthouse-measured metrics (LCP, FID) — use Vercel Analytics' real-user data instead.
- Certificate PDF body translation — still a stakeholder conversation.
- Audit-log `summary` free-text translation — still requires reshaping how audit entries are constructed.
- Third-locale support — the app is bilingual; adding pt-BR or fr would need plural-category and CLDR review, not just JSON duplication.
