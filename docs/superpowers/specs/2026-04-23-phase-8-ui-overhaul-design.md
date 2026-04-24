# Phase 8 — UI Overhaul and Brand Application Design Spec

**Spec date:** 2026-04-23
**Author:** Josue Calderon (with Claude Code brainstorm)
**Status:** Proposed
**Companion doc:** [`docs/brand/brand-guidelines.md`](../../brand/brand-guidelines.md) — canonical brand system reference, shipped alongside this spec

---

## 1. Summary

Phase 8 replaces FundaVida's generic shadcn baseline with a distinctive, brand-led UI system inspired by warm modern-SaaS dashboard patterns (Quez, Learnthru) and informed by FundaVida's existing brand palette. Delivers: a rewritten canonical brand guidelines doc, a full token swap (colors, typography, motion, dark mode), a reworked component library, a bold landing page, and redesigned admin views. Ships in 8 vertical-slice PRs.

The redesign addresses concrete user feedback: "basic and soulless", "no icons, no modals, no animations", "dropdowns cover table data", and "no way to toggle light/dark mode". It also asserts the FundaVida brand (green, blue, flame) that the current app entirely ignores — every UI today uses generic shadcn blue.

## 2. Context and motivation

### 2.1 Current state (pre-redesign)

- Palette: generic shadcn `hsl(221.2 83.2% 53.3%)` blue. **Zero** of FundaVida's 7 core brand colors wired into tokens.
- Typography: browser default `-apple-system`, no custom font loaded.
- Dark mode: tokens defined in `src/index.css` `.dark` block, but no toggle component, no UI access, no per-page audit.
- Admin layout: basic single-column under a thin header; no sidebar sections, no right panel, no command palette.
- Landing: 4 sections shipped in Phase 7 Task 1 (hero, feature preview, tech stack, footer) using placeholder visuals; currently functional but visually flat.
- Data display: plain tables, bare empty states ("No results"), spinners instead of skeletons, dropdowns collide with table rows.
- Animation: none beyond default CSS transitions.
- Icons: Lucide imported (`lucide-react@^1.8.0`) but usage is sparse.

### 2.2 Source references

- **Quez dashboard** — warm modern-SaaS aesthetic: sectioned sidebar, stat cards with mini charts, status pills, avatar stacks, generous whitespace, soft shadows, ~14px radius, friendly microcopy.
- **Learnthru dashboard** — three-panel layout, pastel tonal gradient cards, 3D isometric illustration as hero element, calendar + reminders side widgets, prominent user profile card.
- **FundaVida brand guidelines** (old doc, carried from FundaVida-old repo) — 7 core colors (Figure Blue `#2961CD`, Figure Green `#32982D`, Flame Red `#D20105`, Flame Yellow `#FDCB02`, Wordmark Black `#111111`, Off-white `#FCFCFA`, Near-white `#FEFEFE`), logo lockup, contrast rules, radius 12px, 60/25/10/5 color usage ratio. Gaps: no typography, no spacing scale, no iconography, no illustration, no layout, no empty-states, no motion depth, Spanish-only voice, off-brand chart palette.

### 2.3 Design principles

1. **Brand-led, not template-led.** Every token references a brand color. Generic shadcn defaults leak zero into the final app.
2. **Warmth over sterility.** Modern SaaS can be cold; FundaVida is a non-profit serving youth. Microcopy, illustration, and color use must signal warmth.
3. **Admin = productive, Landing = expressive.** Different energy budgets per surface. Don't pay productivity cost on admin for drama, don't leave the landing page restrained.
4. **Data-rich cards beat big numbers.** Stat cards always show a sparkline or delta, never bare figures.
5. **Empty states are the portfolio tell.** Illustrated empty states separate portfolio-grade from template-grade work more than any hero treatment.
6. **Motion serves comprehension.** Framer Motion for entrances and transitions that carry meaning. Never animate what doesn't need to move.
7. **Dark mode is first-class, not an afterthought.** Curated palette, per-page audit, illustrations have dark variants.

## 3. Decisions made during brainstorm

| Question                   | Answer                                                                    | Rationale                                                                                    |
| -------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Scope of redesign          | Full app (landing + all admin)                                            | Landing without polished admin undercuts itself                                              |
| Aesthetic direction        | Quez + Learnthru hybrid — warm SaaS-dashboard with illustration character | User-picked references, both align with FundaVida's "warm, hopeful, trustworthy" personality |
| Landing page treatment     | More expressive than admin (aurora bg, Framer Motion, isometric hero)     | Recruiters have ~5 seconds; cohesive-with-admin is safe but forgettable                      |
| Hero imagery               | Illustrated only — custom 3D isometric dashboard hero                     | Photos deferred until FundaVida community photos are licensed                                |
| Dark mode depth            | Curated palette, per-page audit                                           | User explicitly asked for toggle; rough-edge dark reads as unfinished                        |
| Animation richness (admin) | Framer Motion entrances + hover micro-interactions + skeleton loaders     | Sweet spot: lively without fighting productivity                                             |
| PR budget                  | 8 PRs                                                                     | Balanced tier; each PR ships user-visible value                                              |

## 4. Design system foundation

See [`docs/brand/brand-guidelines.md`](../../brand/brand-guidelines.md) for the full canonical reference. This section summarizes the decisions that drive Phase 8 implementation.

### 4.1 Color system

- **Core palette:** 7 unchanged brand colors (Figure Blue, Figure Green, Flame Red, Flame Yellow, Wordmark Black, Off-white, Near-white).
- **Tonal ramps:** 11-step OKLCH ramps (`50` through `950`) for `brand-green`, `brand-blue`, `flame-red`, `flame-yellow`, `neutral`.
- **Primary token:** `--primary` = Brand Green 600 `#2A8426` — darker shade of Figure Green, chosen for WCAG-AA-safe contrast against off-white text in normal-size body copy. Replaces current `hsl(221.2 83.2% 53.3%)`. Base Figure Green `#32982D` (green 500) is reserved for `--ring`, chart series, and brand-identity accents. See brand doc §15.2.
- **Secondary token:** `--secondary` = Figure Blue tonal for info states, charts, secondary CTAs.
- **Destructive, warning, success, info:** all re-derived from brand ramps (no off-brand slate).
- **Neutral ramp:** cool gray (hue ~220, low chroma), pairs better with saturated brand than warm brown.
- **Chart palette:** 5 categorical tokens use monochromatic brand-green → brand-blue → flame-yellow → brand-green-dark → brand-blue-dark ramp. Removes off-brand purples (`#B762E0`) and pinks (`#E93D7C`) from current spec.

### 4.2 Dark mode

- Dark palette is **curated**, not token-inverted. Deep navy background (`oklch(0.17 0.02 250)`), off-white foreground, brand colors slightly desaturated (saturated colors vibrate on dark — standard dark-mode rule).
- Primary token in dark uses OKLCH lightness shift of light primary — same hue, different lightness/chroma — so branding stays recognizable.
- Toggle: `light` / `dark` / `system`, three-way. Persisted in `localStorage` under key `fundavida:theme`. Respects `prefers-color-scheme` when `system`.

### 4.3 Typography

Three-font system, self-hosted via `@fontsource/*`:

- **Geist Sans** — admin body + all UI text. Weights: 400, 500, 600. OpenType features enabled: `'cv11'` (single-story `a`), `'ss01'` (modernized `g`).
- **Instrument Serif** — landing page hero headline only. Weights: 400 regular + 400 italic. Never used inside `/app/*`.
- **Geist Mono** — numeric emphasis (stat values, timestamps, IDs, landing code snippets). Weight: 400, 500.

Type scale (Tailwind extends default):

| Token       | Size | Usage                                |
| ----------- | ---- | ------------------------------------ |
| `text-xs`   | 12px | Table footers, form help             |
| `text-sm`   | 14px | Form labels, table body, sidebar nav |
| `text-base` | 16px | Body paragraphs                      |
| `text-lg`   | 18px | Card headings                        |
| `text-xl`   | 20px | Page section headings                |
| `text-2xl`  | 24px | Page titles (H2)                     |
| `text-3xl`  | 30px | Dashboard greeting                   |
| `text-4xl`  | 36px | Landing section headlines            |
| `text-5xl`  | 48px | Landing secondary hero               |
| `text-6xl`  | 60px | Landing hero (mobile)                |
| `text-7xl`  | 72px | Landing hero (desktop)               |

### 4.4 Spacing, radius, shadow

- **Spacing:** Tailwind 4pt scale unchanged. Standardize component-level values in `src/components/ui/variants.ts`.
- **Radius:** `--radius: 0.75rem` (12px). Derived: `sm` 6px, `md` 10px, `lg` 12px, `xl` 16px, `2xl` 24px. Circles use `full`.
- **Shadow:** keep `shadow-soft`, `shadow-card`, `shadow-elevated`. Add `shadow-glow-primary` (brand-green 8% alpha haze, offset 0 8 24) for primary button hover and `shadow-glow-flame` (flame-yellow haze) for celebration moments.

### 4.5 Motion

- **Dependency added:** `framer-motion@^12`.
- **Presets (in `src/lib/motion.ts`):**
  - `fadeIn` — opacity 0 → 1, 200ms ease-out
  - `fadeUp` — opacity 0 → 1 + translateY 8px → 0, 300ms ease-out
  - `scaleIn` — opacity 0 → 1 + scale 0.96 → 1, 250ms ease-out
  - `stagger` — `staggerChildren: 60ms`
- **Route transitions:** `AnimatePresence` wrap around the admin router. Content fades up 8px on `pathname` change.
- **Reduced motion:** `framer-motion` `MotionConfig reducedMotion="user"` at the provider level. Aurora, float, and marquee animations also check the media query and pause.

### 4.6 Iconography

- **Lucide** (`lucide-react`) — all UI icons. Upgrade to current stable (`^0.468.0` or latest; current `^1.8.0` in package.json appears incorrect). ~40–60 usages expected across admin.
- **Custom flame-motif SVG set (6 icons)** — `src/components/icons/flame/`: `flame-hope`, `flame-certificate`, `flame-milestone`, `flame-welcome`, `flame-empty`, `flame-celebration`. Hand-drafted in Figma, exported as optimized SVG, React-component wrapper supporting `size` prop and `currentColor`.

### 4.7 Illustration

- **unDraw** — scene illustrations for empty states, recolored to brand palette. 6 scenes: students, courses, certificates, teachers, reports, audit-logs.
- **Blush.design** or **Humaaans** — avatar placeholders and people illustrations, recolored.
- **Custom Figma-drafted 3D isometric hero illustration** — one-time design for landing hero. Scene: tilted dashboard card, certificate, stylized flame figure. Exported with dark-mode variant (swapped fill on background elements). Subtle CSS float animation.

## 5. Component library

### 5.1 Primitives restyled via token changes (no component code changes)

`Button`, `Card`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `Badge`, `Table`, `Dialog`, `Sheet`, `Drawer`, `Tooltip`, `Popover`, `DropdownMenu`, `Toast`. Tokens cascade.

Additions on top of existing primitives:

- `Button` gains `shadow-glow-primary` on hover for primary variant.
- `Card` gains tonal-gradient variants: `variant="gradient-primary"`, `variant="gradient-flame"`, `variant="gradient-blue"` (Learnthru-style).
- `Badge` gains status-pill variants with soft tinted background: `Badge.Success`, `Badge.Warning`, `Badge.Info`, `Badge.Destructive`, `Badge.Neutral`, each with optional `dot` prefix.
- `Dialog` / `Sheet` wrapped with Framer Motion entrance (fade + scale from 0.96), overlay `backdrop-blur-sm`.
- **`DropdownMenuContent` + `PopoverContent` global defaults:** `collisionBoundary="viewport"`, `align="end"`, `sideOffset={4}`. Fixes the "dropdowns cover tables" bug at the primitive level.
- `Toast` (Sonner) variants repainted: success green-500, error flame red, warning flame yellow (with black text for contrast), info blue-500.

### 5.2 New reusable components

Location: `src/components/ui/` (shadcn-adjacent primitives) or `src/components/shared/` (feature-agnostic patterns).

| Component          | File                                                   | Purpose                                                                                                                               |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `StatCard`         | `src/components/shared/StatCard.tsx`                   | Numeric stat + label + sparkline + delta + trend arrow. `variant="default" \| "primary" \| "flame" \| "blue"`. Uses `AnimatedNumber`. |
| `AvatarStack`      | `src/components/shared/AvatarStack.tsx`                | 3–5 overlapping avatars with `+N` overflow badge. Props: `avatars`, `max`, `size`.                                                    |
| `EmptyState`       | `src/components/shared/EmptyState.tsx`                 | Illustration slot + heading + body + optional CTA.                                                                                    |
| `PageHeader`       | `src/components/shared/PageHeader.tsx`                 | Standardized title + description + action slot across admin.                                                                          |
| `WelcomeBanner`    | `src/components/shared/WelcomeBanner.tsx`              | Dashboard greeting + context + CTA + illustration.                                                                                    |
| `CalendarWidget`   | `src/components/shared/CalendarWidget.tsx`             | Monthly calendar with event dots.                                                                                                     |
| `UpcomingList`     | `src/components/shared/UpcomingList.tsx`               | Reminders/events list with colored bell icons.                                                                                        |
| `ThemeToggle`      | `src/components/shared/ThemeToggle.tsx`                | Light/dark/system three-way toggle.                                                                                                   |
| `AnimatedNumber`   | `src/components/shared/AnimatedNumber.tsx`             | Counter tween from 0 to target on mount.                                                                                              |
| `SkeletonTable`    | `src/components/shared/skeletons/SkeletonTable.tsx`    | Table loading state.                                                                                                                  |
| `SkeletonCard`     | `src/components/shared/skeletons/SkeletonCard.tsx`     | Generic card loading state.                                                                                                           |
| `SkeletonStatCard` | `src/components/shared/skeletons/SkeletonStatCard.tsx` | Stat card loading state.                                                                                                              |
| `LogoMark`         | `src/components/brand/LogoMark.tsx`                    | Logo lockup with size + variant props (full / icon-only / wordmark-only / mono).                                                      |

### 5.3 Brand components

Location: `src/components/brand/`.

- `FlameIcon` set (6 icons, one file per icon).
- `FlameSeparator` — decorative SVG divider between landing sections.
- `LogoMark` — see above.

### 5.4 Landing-only components

Location: `src/components/landing/`. Imported from Aceternity UI / Magic UI registries via `npx shadcn add`; adapted to brand tokens.

- `AuroraBackground` — brand-green + brand-blue + flame-yellow aurora drift.
- `BentoGrid` — feature preview layout.
- `NumberTicker` — animated stat counters.
- `Marquee` — horizontal tech-stack scroll.
- `AnimatedBeam` — subtle beam effect.
- `TextRevealCard` — scroll-triggered headline reveal.

### 5.5 Navigation restyle

- **Sidebar:** sectioned groups (`PROGRAMAS`, `PERSONAS`, `REPORTES`, `CONFIGURACIÓN`) with subhead labels; active item has 2px brand-green left accent bar + soft tint background; collapsed state 64px wide with icons-only and tooltips; `NeedHelpCard` at bottom.
- **Header:** breadcrumbs (left), optional search slot (center), `ThemeToggle` + user/role menu (right).

### 5.6 Command palette (new)

`Cmd+K` / `Ctrl+K` globally. Built on shadcn `Command`. Sections:

- Navigation (quick-jump to any route)
- Actions (`Agregar estudiante`, `Nuevo curso`, `Emitir certificado`, etc.)
- Settings (theme toggle, language toggle, role switch)
- Recent (persisted last 5 actions)

Bilingual command labels. Keyboard shortcuts shown on the right.

## 6. Landing page redesign

Six sections, scroll-triggered reveals, aurora background bleeds through the hero only.

1. **Hero** — `AuroraBackground`, two-column desktop (text left 55% / illustration right 45%), stacked on mobile. Eyebrow label (brand green, tracked), Instrument Serif headline (`text-7xl`, italicized final word), Geist subhead, primary CTA (`Enter as admin`) + secondary CTA (`View on GitHub`), "No signup · Data lives in your browser" microcopy. Custom 3D isometric dashboard illustration with float animation. Scroll cue at bottom (flame icon with pulse).
2. **Trust strip** — narrow band, `bg-muted/30`, headline (`Rearchitected from a production platform`), 4 `NumberTicker` stats (`8` Modules · `2` Locales · `167+` Tests · `0` Backends), `staggerChildren` 60ms on scroll.
3. **Feature bento** — `BentoGrid` 2×2 mixed sizes. Cell 1 (2×1): CRUD hero modules with students table mini. Cell 2: PDF certificates. Cell 3: Bilingual EN/ES. Cell 4: Deterministic seed data (Geist Mono code sample). Hover lift + elevated shadow. Replaces `FeaturePreview.tsx`.
4. **Rearchitecture delta** — Instrument Serif section headline (`From Supabase-backed to browser-only`), side-by-side before/after 5 rows matching README delta table, left column muted/strike-through, right column brand-green highlights, rows animate in from opposite sides with stagger.
5. **Tech stack marquee** — `Marquee` two rows opposite directions, 16 tech badges with `simple-icons` SVGs, pauses on hover, monospace text, soft border, tonal brand-blue hover. Replaces static `TechStack.tsx`.
6. **Final CTA + Footer** — full-width brand-green tonal gradient CTA card with flame-motif watermark, headline + one CTA button + microcopy. Footer (enhanced `LandingFooter.tsx`): three columns (About FundaVida / Project / Author), bottom strip with `FlameSeparator` divider, `© 2026 · Rearchitected as a portfolio project · Original platform built for FundaVida Costa Rica · Hope changes everything.`

### 6.1 Animation

- Mount: hero fades up with 150ms stagger (eyebrow → headline → subhead → CTAs), illustration fades + scales 0.96 → 1.
- Scroll: each section enters via `useInView({ amount: 0.3 })` with `fadeUp` + 60ms child stagger.
- Reduced motion: all entrances instant; aurora, float, marquee pause.

### 6.2 Accessibility

- Aurora is decorative (`aria-hidden`).
- Hero illustration has locale-specific `alt` text.
- All motion respects `prefers-reduced-motion`.
- Focus order = source order.
- Contrast audited per brand doc §7 — brand green never carries body copy (only large headlines).

### 6.3 Copy (EN + ES)

Every new string under `landing.*` in `src/locales/en.json` + `src/locales/es.json`. New keys (approximate):

- `landing.hero.eyebrow`, `.headline`, `.subhead`, `.primaryCta`, `.secondaryCta`, `.noSignup`
- `landing.trustStrip.headline`, 4× `landing.trustStrip.stat.*.{value,label}`
- `landing.featureBento.*` (4 cells × `{title,caption}`)
- `landing.rearchitecture.headline`, 5× delta rows × `{before,after}`
- `landing.techStack.headline`, `landing.techStack.caption`
- `landing.finalCta.headline`, `.subline`, `.cta`
- Footer additions for the bottom strip

`npm run i18n:check` enforces parity.

## 7. Admin UI redesign

### 7.1 Global layout

Three-zone layout, responsive:

- **Sidebar (240px → 64px collapsed):** sectioned nav, active accent, `NeedHelpCard`.
- **Header (56px):** breadcrumbs · optional search · `ThemeToggle` · user/role menu.
- **Main (fluid, max 1440px centered):** `PageHeader` + content.
- **Right panel (280px, Dashboard + select pages):** `CalendarWidget`, `UpcomingList`, quick-stats. Hidden below `xl`; collapses into bottom drawer on mobile.

Route transitions via `AnimatePresence` + `fadeUp`.

### 7.2 Dashboard homepage (`/app`)

Flagship view. Structure:

- `WelcomeBanner` with role-aware greeting, dynamic context line, CTA, `flame-welcome` illustration. Brand-green tonal gradient.
- Stat-card row: 4 `StatCard`s (Students · Active Courses · Certificates Issued · TCU Hours), first card uses `variant="primary"`, rest neutral, all with AnimatedNumber + sparkline + delta.
- Bento section 2×2: Recent activity list, Top courses list, Pending approvals callout (flame-yellow tonal if count > 0), Attendance snapshot.
- Right panel: `CalendarWidget` (event dots) + `UpcomingList` (colored bell icons per event type).

### 7.3 List/index pages — unified pattern

Applied to: Students, Courses, Teachers, Enrollments, Grades, Attendance, Audit Logs, TCU (8 pages).

- `PageHeader` with title + count + primary CTA.
- Filter bar: search + filter dropdowns + optional view toggle.
- Table: 48px rows, zebra-free, hover tint, sticky header, sortable chevron-animated headers, selection checkboxes where applicable, avatar-stack column, status-pill column, numeric columns right-aligned in Geist Mono, action dropdown (collision-fixed).
- Empty state: `flame-empty-*` illustration + heading + CTA.
- Loading: `SkeletonTable` 8 rows matching column shapes.
- Pagination footer: rows-per-page + range indicator + page controls.

### 7.4 Detail pages (Student, Course, Certificate) — unified pattern

- Back link + `PageHeader`.
- Hero card: avatar/icon, name, metadata badges, primary action.
- Radix tabs (`Overview`, `Grades`, `Attendance`, `Documents` as applicable).
- Two-column layout inside tabs: main (70%) + side panel (30%).
- Framer Motion `fadeUp` stagger on tab content change.

### 7.5 Reports module — bento-grid treatment

Replaces current plain-card layout. `/app/reports`:

- `PageHeader` + date-range picker.
- 4×3 bento grid with mixed cells:
  - Big cell (2×2): Enrollment trend line chart (brand-green primary, brand-blue prior-year reference, soft area fill).
  - Medium cell (1×2): Attendance heatmap (7×12 grid, green → red tonal ramp).
  - Stat cell: Average grade (donut chart).
  - Stat cell: TCU hours vs. target (progress ring).
  - Stat cell: Certificates this month (big number + delta).
  - Medium cell: Top 5 courses by enrollment (horizontal bar chart).
  - List cell: Upcoming milestones (`UpcomingList`).
- All charts use monochromatic brand ramps (no purples/pinks).
- `@media print` strips sidebar/header for clean print export.

### 7.6 Certificates module — special treatment

- **Grid view (default):** cards showing mini cert thumbnails + student + course + completion date + status pill. 3–4 columns desktop responsive.
- **Preview modal:** Framer Motion fade + scale entrance, `backdrop-blur-sm`. `PDFViewer` iframe (working in real Chrome per Phase 7 Task 2 follow-up). Close + download in header. "Issue certificate" CTA in footer when student has passing grades.
- **Empty state:** `flame-certificate` illustration + CTA linking to eligible-students view.

### 7.7 Empty-state library

Six empty states (one per module): `students`, `courses`, `certificates`, `teachers`, `reports`, `audit-logs`. Each: 240px-wide SVG illustration + Instrument Serif heading + Geist body + CTA.

### 7.8 Dark mode per-page audit

Delivered as part of PR 2. Every page opened in dark mode during QA; component tokens adjusted where they read poorly. Charts get heavier line weights and more muted fills in dark. Illustrations have dark-variant exports switched via media-query inside the SVG.

### 7.9 Accessibility sweep

- Keyboard: full tab order, `Escape` closes modals/menus, `Cmd+K` opens palette.
- Screen reader: icons have `aria-label` or `aria-hidden`; status pills announce status + context.
- Focus rings: 2px brand-green outline, never removed.
- Color-only state: every status pill has dot + text.
- Motion: `prefers-reduced-motion` disables Framer Motion at provider.

## 8. Brand guidelines doc

Rewritten from scratch at [`docs/brand/brand-guidelines.md`](../../brand/brand-guidelines.md), shipped alongside this spec. An earlier stray copy at `docs/brand_guidelines.md` (carried from FundaVida-old as a local reference) never entered git — it was removed before the spec commit.

### 8.1 New structure (18 sections)

1. Brand essence (kept, refreshed)
2. Logo (kept + new usage variants)
3. Color system (major rewrite: tonal ramps, semantic tokens, dark palette, contrast matrix)
4. Typography (new — three-font system, scale, weights, usage)
5. Spacing (new — 4pt scale, component spacing)
6. Radius, shadow, elevation (refresh + glow tokens)
7. Motion (major rewrite — presets, timing, anti-patterns)
8. Iconography (new — Lucide + flame-motif custom set)
9. Illustration (new — style, sourcing, dark variants)
10. Photography (new — stance, deferred)
11. Layout & grid (new — 1440px max, 12-col, breakpoints, bento)
12. Component patterns (new — buttons, inputs, cards, tables, dialogs, dropdowns, toasts)
13. Data visualization (new — chart palette, principles)
14. Voice & tone (revise — bilingual EN/ES)
15. Accessibility (kept + extended for dark mode)
16. Dark mode (new section)
17. Patterns to avoid (new — "the AI template checklist")
18. Asset reference (updated paths)

Authored in English. Spanish voice rules apply to product copy, not the doc itself. ~900–1200 lines.

## 9. Delivery plan — 8 vertical-slice PRs

Each PR ships user-visible value; nothing on `main` is left half-done.

**PR 1 — Design tokens + logo asset wiring** (`feat/phase-8-brand-foundation`)

- Note: `docs/brand/brand-guidelines.md` and `public/logo.svg` ship with the spec commit (this one), not in PR 1. PR 1 applies the tokens those docs mandate.
- Swap palette in `src/index.css` + `tailwind.config.ts` — OKLCH brand ramps, semantic tokens (note `--primary` = green 600, `--ring` = green 500), full dark palette.
- Add shadow-glow tokens (`shadow-glow-primary`, `shadow-glow-flame`).
- **New dependencies (devDeps + runtime):**
  - `framer-motion@^12` — motion presets, route transitions.
  - `@fontsource/geist-sans@^5`, `@fontsource/geist-mono@^5`, `@fontsource/instrument-serif@^5` — self-hosted fonts.
  - `sonner` — toast system (shadcn-recommended).
  - `recharts@^2` — chart rendering (needed in PR 5+ but added now to keep deps change in one PR).
  - `cmdk` — command palette primitive (transitive via shadcn `Command` add; added explicitly for clarity).
- Fix `lucide-react` version (current `^1.8.0` appears wrong; upgrade to current stable `^0.468.0` or latest).
- No visual redesign — components pick up new tokens automatically. Visible outcome: noticeable color + font shift.

**PR 2 — Theme toggle + dark mode audit** (`feat/phase-8-theme-toggle`)

- `ThemeToggle` component + header integration.
- Three-way light/dark/system, persisted to `localStorage`, respects `prefers-color-scheme`.
- Per-page dark-mode audit across all 17 admin pages + landing; token tweaks as needed.
- Visible outcome: user-facing toggle shipping full dark mode.

**PR 3 — Shared components + flame icons** (`feat/phase-8-shared-components`)

- Build: `StatCard`, `EmptyState`, `AvatarStack`, `PageHeader`, `WelcomeBanner`, `CalendarWidget`, `UpcomingList`, `AnimatedNumber`, `Skeleton*`.
- 6 custom flame SVG icons + `FlameIcon` component.
- `LogoMark` component (uses master `public/logo.svg`).
- Vitest smoke test per component.
- Visible outcome: none directly; next PRs consume these.

**PR 4 — Navigation + command palette + dropdown fix** (`feat/phase-8-navigation`)

- Sidebar restyle: sections, active accent, collapse, `NeedHelpCard`.
- Header restyle: breadcrumbs + theme toggle + user/role menu.
- Global `DropdownMenuContent` / `PopoverContent` collision-boundary defaults → fixes dropdown-over-table bug.
- `Cmd+K` command palette (shadcn `Command`).
- `AnimatePresence` route transitions.
- Integrate `PageHeader` across admin pages.
- Visible outcome: whole-app navigation redo + dropdown fix.

**PR 5 — Dashboard homepage redesign** (`feat/phase-8-dashboard`)

- `WelcomeBanner`, stat-card row, bento section, right panel.
- `CalendarWidget` + `UpcomingList` consuming real data.
- Visible outcome: dashboard feels like Learnthru + Quez combined.

**PR 6 — List pages unified pattern** (`feat/phase-8-list-pages`)

- Apply unified table pattern to Students, Courses, Teachers, Enrollments, Grades, Attendance, Audit Logs, TCU.
- Empty states with 6 custom illustrations (recolored unDraw).
- Skeleton loaders.
- Visible outcome: every admin list page coherent.

**PR 7 — Reports bento + Certificates grid** (`feat/phase-8-reports-certs`)

- Reports: 4×3 bento with charts using monochromatic brand ramps. Print stylesheet.
- Certificates: grid-of-cards default view, updated preview modal.
- Visible outcome: Reports showcase-quality; Certificates becomes a hero surface.

**PR 8 — Landing page full redesign** (`feat/phase-8-landing`)

- `AuroraBackground`, new Hero with 3D isometric illustration, TrustStrip, FeatureBento, RearchitectureDelta, TechStackMarquee, FinalCTA.
- Regenerate screenshots via `npm run screenshots` at the end (showcases polished admin from PRs 5–7).
- Visible outcome: recruiter-facing surface sells the product.

### 9.1 Phase 7 resumption

Once PR 8 lands, Phase 7 tasks 4–6 pick up:

- Task 4 (Vercel deploy) — deploys polished app.
- Task 5 (Lighthouse CI) — thresholds tuned to new design.
- Task 6 (cleanup) — final pass.

The merged PR #43 (Phase 7 README rewrite) stays as-is; screenshot refresh happens naturally in PR 8.

## 10. Testing strategy

- **Unit:** Vitest smoke tests for every new component in `src/components/shared/` and `src/components/brand/`. Assert: renders, accepts variants, passes accessibility basics (role, aria-label presence).
- **Integration:** existing Vitest page tests extended for new interactions (theme toggle persists, command palette opens on Cmd+K, dropdown doesn't overlap row).
- **E2E:** new Playwright specs for theme toggle + command palette flows. Existing specs updated if selectors shift.
- **Visual regression:** deferred (not worth the maintenance cost for a 1-person portfolio project). Rely on per-PR manual review + screenshot regeneration as lightweight visual acceptance.
- **Accessibility:** axe-core runs in Vitest component tests. Focus order + keyboard nav manually verified per PR.
- **i18n parity:** `npm run i18n:check` gates every PR.
- **Gauntlet (per PR):** `npm run typecheck && lint && format:check && test && i18n:check && build && e2e`.

## 11. Non-goals / deferred work

- **Real FundaVida community photography** — deferred until assets are licensed from fundavida.org.
- **Commissioned 3D illustrations** — using Figma-drafted SVG hero + recolored unDraw for scenes, not hiring an illustrator.
- **Shared-layout route animations** — Tier B explicitly excluded orchestrated cross-page animations.
- **Mobile-first bottom-nav redesign** — responsive collapses acceptable; no dedicated mobile app shell.
- **Visual regression test suite** — see §10.
- **Storybook** — component patterns documented in brand doc rather than standalone Storybook site.
- **RTL support** — not in scope; FundaVida is EN/ES only.
- **Theming beyond light/dark** — no user-customizable themes, no seasonal variants.
- **Per-role UI** — role switcher remains; UI doesn't fork by role beyond what already exists.

## 12. Rollout

- **Branch model:** one branch per PR, branching off fresh `main` each time (same pattern as Phase 7 tasks).
- **Review gates:** each PR gets spec-compliance + code-quality review via `superpowers:subagent-driven-development` before merge.
- **No force-pushes.** No Claude co-author trailers. Conventional commits, lowercase-first imperative (commitlint enforced).
- **Feature flags:** none — redesign merges incrementally to `main`. Each PR ships a coherent slice.
- **Fallback:** if a PR reveals the direction is wrong mid-execution, pause and reopen brainstorm. No rip-and-replace shipped on main.

## 13. Exit criteria

Phase 8 is complete when:

1. All 8 PRs merged.
2. `docs/brand/brand-guidelines.md` is the canonical reference (shipped with this spec).
3. `ThemeToggle` works across all pages, light + dark audited per page.
4. Landing page renders with `AuroraBackground`, isometric hero illustration, bento grid, marquee, all sections animate on scroll.
5. Dashboard shows `WelcomeBanner` + stat cards with sparklines + bento + right panel.
6. All 8 list pages use unified table pattern with illustrated empty states.
7. Reports uses bento with monochromatic brand charts.
8. Certificates defaults to grid-of-cards view.
9. Command palette opens on `Cmd+K` globally.
10. Dropdown menus no longer obscure active table rows.
11. Zero generic shadcn blue remaining; every primary token = brand green.
12. Every PR's gauntlet green.
13. Phase 7 Tasks 4–6 resume on top of a fully polished app.

---

**Implementation starts with PR 1 after:** this spec is reviewed and approved → `writing-plans` skill generates the phase-8 implementation plan → `subagent-driven-development` executes it.
