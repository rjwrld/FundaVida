# Green System → Figure Green + Calendar Redesign — Implementation Plan

> **For the next session / agentic workers:** This plan is self-contained — you do **not** need the conversation that produced it. Read "Context" then execute PR 1, verify, then PR 2. Use `superpowers:executing-plans` or `/tdd`. Steps use checkbox (`- [ ]`) syntax.

**Status:** **PR 1 implemented 2026-06-25** (branch `fix/green-system-figure-green`); PR 2 pending. User reviewed mocks and chose: green = **Figure Green**, calendar = **variant B**, split = **two PRs**. Final dialed OKLCH: light `--primary` `0.5 0.16 138`, dark `0.70 0.17 138`; `--success` `0.57 0.17 138` / `0.68 0.16 138`; `--ring` `0.57 0.17 138` / `0.68 0.16 138`. Dark data fills (progress, attendance sparkline, trend cursor) flipped to Brand Green 400 via `--chart-1`. Accent hovers kept mono (Task 1.4 default). Attendance heatmap dark-mode scale left for a dedicated data-viz pass (sequential-scale inversion, not dullness — out of PR 1's minimal scope).

**Goal:** Make every green in the app consistent and true to the FundaVida brand, and redesign the calendar so it's clean, interactive, and present on every role's dashboard.

---

## Context (why this exists)

The app currently shows **three clashing greens**:

| Token           | OKLCH                       | Reads as                          | Source                                                                                                                                                       |
| --------------- | --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--primary`     | `0.882 0.263 136`           | **neon lime** `#7CFC00`           | Off-brand. Imported by the blueprint skin from [docs/DESIGN.md](../../DESIGN.md), a generic _"Revenue-Grade Automation"_ SaaS style ref — **not FundaVida**. |
| `--success`     | `0.73 0.18 149`             | emerald `#22c55e`                 | A second off-hue green.                                                                                                                                      |
| `brand-green-*` | hue `138` (500 = `#32982D`) | **Figure Green** (the logo green) | The **real brand**, already used on ~30 data/feature surfaces (calendar, charts, progress, heatmap, avatars).                                                |

The clash is a **half-finished migration**: the June-2026 [blueprint-skin re-skin](2026-06-03-blueprint-skin-ui.md) swapped `--primary` to the off-brand lime and **explicitly deferred its Phase 5** ("feature/data-viz colour audit") — which is exactly the leftover Figure-Green data surfaces. Phase 5 was never done.

**Decision:** unify on **Figure Green** (the logo color, hue 138), demote the lime, and keep the blueprint's Frost/Paper/Ink monochrome base + flat/no-shadow aesthetic. This is a **correction back to the documented brand** ([brand-guidelines.md](../../brand/brand-guidelines.md) already specifies Figure Green as `--primary`), not a brand pivot. Because the data surfaces are already Figure Green, the core change is just two tokens.

---

## Guardrails (every task)

- **Branch off `main`.** Do NOT build on the current `fix/tcu-*` branch.
- **Two PRs, one concern each:** PR 1 = green tokens; PR 2 = calendar + dashboards.
- **Landing is out of scope.** Do not edit `src/pages/LandingPage.tsx` or `src/components/landing/*`. The token change _will_ recolor the landing green via cascade — that's accepted (landing is being redesigned separately). Verify only on `/app` routes.
- **Dial final OKLCH in the running preview**, don't trust the triplets below blindly — sample computed colors and nudge (the repo's established process, blueprint plan Task 4.2).
- **Full CI gate before each PR:** `typecheck · lint · format:check · i18n:check · test · build · e2e`. Local `typecheck+lint+test` alone false-greens (misses `i18n:check` + the e2e cache/empty-state class).
- **Conventional commits, NO `Co-Authored-By` / "Generated with Claude" trailers.**
- All user-facing strings via i18next with matching **EN + ES**.

---

## PR 1 — Green system (`fix/green-system-figure-green`)

The brand-green ramp **stays as-is** (it's already Figure Green). We only repoint the two off-brand semantic tokens at it, plus a vibrancy check on dark.

### Task 1.1 — Repoint `--primary` lime → Figure Green

**File:** [src/index.css](../../../src/index.css) lines **79–80** (`:root`) and **113–114** (`.dark`)

- [x] Light (`:root`):
  - `--primary: 0.882 0.263 136;` → `--primary: 0.5 0.16 138;` (brand-green-600 `#2A8426`, AA-safe for off-white text)
  - `--primary-foreground: 0.26 0 0;` → `--primary-foreground: 0.99 0.003 95;` (off-white — text now sits on a _dark_ green, so it must be light)
- [x] Dark (`.dark`):
  - `--primary: 0.882 0.263 136;` → `--primary: 0.70 0.17 138;` (vivid Figure Green — the value the user approved in mock; dial between brand-green-400 `0.68 0.16` and `0.72 0.18` in preview)
  - `--primary-foreground: 0.26 0 0;` → keep Ink `0.26 0 0` (text sits on a _light_ green in dark mode — Ink is correct)

This auto-updates every `--primary` consumer: `button.tsx` default, `badge.tsx` default, `AppSidebar` active nav, `PendingApprovals` CTA, and (via cascade) the landing Hero/TrustStrip/DemoBanner.

### Task 1.2 — Repoint `--success` emerald → Figure Green

**File:** [src/index.css](../../../src/index.css) lines **89** and **123**

- [x] Light: `--success: 0.73 0.18 149;` → `--success: 0.57 0.17 138;` (brand-green-500)
- [x] Dark: `--success: 0.73 0.18 149;` → `--success: 0.68 0.16 138;` (brand-green-400)

Kills the third green. Affects success toasts/badges (`badge.tsx` success, `UpcomingList` success, Sonner success). Verify the soft success pill still reads against `bg`.

### Task 1.3 — `--ring` → Figure Green (on-brand focus ring)

**File:** [src/index.css](../../../src/index.css) lines **94** and **128**

- [x] Light: `--ring: 0.26 0 0;` → `0.57 0.17 138;` · Dark: `--ring: 0.96 0 0;` → `0.68 0.16 138;`
- Per brand-guidelines §15.2 (ring = brand green). **Verify in preview** — if green rings feel too loud against the mono UI, revert this one task only (it's independent).

### Task 1.4 — (Judgment call) green-tinted hovers

**File:** [src/index.css](../../../src/index.css) `--accent`/`--accent-foreground` lines **85–86** / **119–120**

- The blueprint deliberately made `--accent` neutral Frost to keep green _scarce_. Now that green is the brand voice, brand-guidelines §3.3 wants `--accent` = brand-green-50 / `--accent-foreground` = brand-green-700 (subtle green hovers).
- [x] **Decide in preview:** keep mono hovers (less churn) **or** switch to green tints (more green-forward). Default: **keep mono** unless the user asks — this changes every ghost/nav hover. Leave a note in the PR description either way.

### Task 1.5 — Vibrancy pass on dark (complete blueprint Phase 5)

The data surfaces already use `brand-green-*`, but forest-500 (`0.57`) can read muddy on the `#161616` dark canvas. Audit these and bump fills/accents to brand-green-400 on dark **only where they look dull** (don't blanket-change):

- [x] [src/components/ui/progress.tsx:15](../../../src/components/ui/progress.tsx) — `bg-brand-green-500` (progress fill)
- [x] [src/components/dashboard/AttendanceSnapshot.tsx:58](../../../src/components/dashboard/AttendanceSnapshot.tsx) — sparkline `fill`
- [x] [src/components/reports/EnrollmentTrendChart.tsx:48](../../../src/components/reports/EnrollmentTrendChart.tsx) — line `stroke`
- [ ] [src/components/reports/AttendanceHeatmap.tsx:15-18,69-78](../../../src/components/reports/AttendanceHeatmap.tsx) — scale steps — **deferred** (dark scale inversion is a data-viz concern, not dullness; out of PR 1 scope)
- [x] `--chart-1` (index.css 97/130) already = brand-green-500 light / brand-green-400 dark — confirm vivid.
- Prefer the existing ramp stops (400 on dark) over inventing values. Keep the diff minimal.

### Task 1.6 — Lime-leak verification (no code, just check)

- [x] Grep `(bg|text|border|ring|decoration)-primary` and confirm all ~9 consumers now render Figure Green with correct text contrast (white on light-mode green, Ink on dark-mode green): `button.tsx`, `badge.tsx`, `AppSidebar.tsx`, `PendingApprovals.tsx`, `landing/*` (verify only, don't edit). Buttons currently set `text-primary-foreground font-bold` — still correct.

### Task 1.7 — Apply the doc amendments

- [x] Apply the ready-to-paste text in **Appendix A** to [brand-guidelines.md](../../brand/brand-guidelines.md), [the blueprint plan](2026-06-03-blueprint-skin-ui.md), and [DESIGN.md](../../DESIGN.md). (Pointer banners are already in those files from the planning session — replace "decision pending" with "done" and fill final OKLCH.)

### PR 1 verification

- [ ] `npm run typecheck && npm run lint && npm run format:check && npm run i18n:check && npm run test && npm run build && npm run e2e` — all green. Copy/ARIA/roles unchanged, so unit+e2e stay green; fix any test asserting a `--primary` color class inline.
- [ ] Preview-walk `/app` in **light + dark**: `/app`, `/app/students`, `/app/reports`, `/app/certificates`. Primary buttons, active nav, success pills, charts, progress, calendar — all read as one Figure Green. Screenshot both modes.
- [ ] Commits (one per task): `style: repoint --primary to Figure Green`, `style: unify --success to Figure Green`, `style: brand-green focus ring`, `style: vivid green on dark data surfaces`, `docs: record green-system realignment to Figure Green`.

> **PR 1 does NOT redesign the calendar.** It only retokenizes. The calendar stays visually variant-A but green-correct. Redesign is PR 2.

---

## PR 2 — Calendar redesign + calendar on every dashboard (`feat/dashboard-calendar`)

### Task 2.1 — Rebuild `CalendarWidget` to variant B

**File:** [src/components/shared/CalendarWidget.tsx](../../../src/components/shared/CalendarWidget.tsx) (rewrite the day grid, lines ~96–156)

- [ ] Day cells: `aspect-square` filling the 7-col track — **remove fixed `h-8 w-8`** (this is the "buttons floating in huge columns" bug on the full-width `/calendar` page).
- [ ] Weekends render like weekdays — **remove** the `weekend && !today && 'text-muted-foreground'` rule (weekends currently look disabled).
- [ ] **Today** = green underline bar under the number + green number. **Remove** the filled circle (lines 124–129) and the ghost ring (lines 118–123).
- [ ] **Selected (not today)** = soft green tint fill (`bg-brand-green-500/15`-ish) + green text. **Remove** the `ring-[1.5px]` (lines 130–135).
- [ ] **Events** = thin quiet green bar under the number (brand-green, a darker/quieter stop so dense months don't shout). **Remove** the dot (lines 144–152). Keep `data-has-event` (a test asserts it).
- [ ] Outside-month days: keep dimmed (`opacity-30`).
- [ ] Accent color comes from `--primary` / brand-green so it tracks the token from PR 1.
- [ ] Keep all `aria-label`s and keyboard behavior.

### Task 2.2 — Clean animation

- [ ] Month change: wrap the grid in `AnimatePresence` keyed on the month; fade + small x-slide (~250ms). Day-select: tint fades/scales in (~180ms).
- [ ] Use existing presets in [src/lib/motion.ts](../../../src/lib/motion.ts) (`fadeUp`, `transitionDefaults`, `transitionFast`) — don't invent new curves. No bounce/spring (brand motion spec §7.7). Reduced-motion is already handled by the app-level `MotionConfig`.

### Task 2.3 — Extract a reusable `DashboardCalendar`

- [ ] New `src/components/shared/DashboardCalendar.tsx`: `CalendarWidget` + a selected-day **sessions list**, scoped to the viewer's courses. Reuse the session-derivation already in [RoleCalendar.tsx](../../../src/components/shared/RoleCalendar.tsx) (`sessionsFor`, `daySessions`) so the `/calendar` page and the dashboard sidebar share one implementation (DRY). Vertical layout (calendar on top, sessions below) for the sidebar; `RoleCalendar` keeps its side-by-side layout for the full page.
- [ ] Props: `courses` (already-scoped), `linkSessions` (teacher/admin link into attendance, student read-only — ADR-0013, ADR-0012).

### Task 2.4 — Shared dashboard shell, calendar on all roles

**Files:** [AdminDashboard.tsx](../../../src/components/dashboard/AdminDashboard.tsx), [TeacherDashboard.tsx](../../../src/components/dashboard/TeacherDashboard.tsx), [StudentDashboard.tsx](../../../src/components/dashboard/StudentDashboard.tsx), [TcuDashboard.tsx](../../../src/components/dashboard/TcuDashboard.tsx)

- [ ] Extract the two-column shell from `AdminDashboard` (`grid xl:grid-cols-[minmax(0,1fr)_300px]`, main + aside) into a shared `DashboardShell`. Aside = `DashboardCalendar` + the existing Upcoming panel.
- [ ] Refactor `AdminDashboard` onto it (its calendar is currently **dead — no `onSelect`**; make it interactive).
- [ ] Add the aside to Teacher / Student dashboards. They already fetch scoped `useCourses()` — pass those. `linkSessions`: admin/teacher `true`, student `false`.
- [ ] **OPEN ITEM — confirm before building:** does the `tcu` role have courses/sessions? Check `scopeFor('tcu').courses`. If tcu has no meaningful sessions, **omit** the calendar from `TcuDashboard` (don't show an always-empty calendar). Resolve by reading `src/permissions/matrix.ts` + `src/data/api/scope.ts`.

### Task 2.5 — Tests (TDD: red → green)

- [ ] Update [CalendarWidget.test.tsx](../../../src/components/shared/__tests__/CalendarWidget.test.tsx): keep the 4 behavior tests (heading, `data-has-event`, `onSelect`, month nav); update/add DOM assertions for the new treatment (today underline present, weekend NOT muted, selected tint, event bar not dot).
- [ ] New test for `DashboardCalendar`: selecting a day lists that day's sessions; student entries are non-links, teacher/admin are links.
- [ ] [DashboardPage.test.tsx](../../../src/pages/__tests__/DashboardPage.test.tsx): assert the calendar renders for student + teacher (and admin).
- [ ] **e2e** (CI-only, catches what unit can't): calendar visible + clickable on a non-admin dashboard; clicking a day shows its sessions. (Per CLAUDE.md, e2e is where the dashboard-wiring/empty-state class of bug surfaces.)

### Task 2.6 — i18n

- [ ] Reuse existing keys: `calendar.panelTitle`, `calendar.emptyDay`, `calendar.sessionEntry`, `dashboard.rightPanel.*`. Only add new keys if a new label is introduced (e.g. a per-day "Sessions on {{date}}" heading) — if so, add to **both** `src/locales/en.json` and `es.json` and run `i18n:check`.

### PR 2 verification

- [ ] Full gate (all 7). Preview-walk every role dashboard (switch roles via the role switcher) in light + dark; click days; confirm sessions update and links route correctly. Screenshot.
- [ ] Commits: `feat: redesign calendar to clean underline/bar treatment`, `feat: interactive role-scoped calendar on every dashboard`, `test: calendar redesign + dashboard calendar`.

---

## Appendix A — Doc amendments (ready to apply in Task 1.7)

**brand-guidelines.md** — already specifies Figure Green as `--primary`; the app is realigning _to_ it. Replace the planning pointer with: a one-line note in §3.3 that the electric-green blueprint interlude was reverted on `<date>` (see this plan); fill the dark `--primary` row with the final dialed OKLCH.

**2026-06-03-blueprint-skin-ui.md** — the locked accent `#7CFC00` is **superseded by Figure Green** (off-brand import corrected); **Phase 5 is completed** by this plan's Task 1.5. Update the pointer banner to "done."

**DESIGN.md** — keep as the historical external style reference, but the banner must state its lime accent was **not** adopted as the brand green (Figure Green is) so no future agent re-introduces `#7CFC00`.

## Rollback

Each task is an isolated commit; `git revert <sha>` backs out any single step. PR 1 is confined to `src/index.css` (+ a few dark-mode stop bumps) + docs; reverting its commits restores the lime wholesale.
