# Blueprint Skin — App UI Re-skin Implementation Plan

> **⚠️ Amended (2026-06-25, done):** The locked accent — electric green `#7CFC00` — was **superseded by Figure Green** (the off-brand lime corrected to the real logo green, hue 138): light `--primary` `oklch(0.5 0.16 138)`, dark `oklch(0.70 0.17 138)`. The deferred **Phase 5** (feature/data-viz colour audit, §"Phase 5" below) is **completed** by [`2026-06-25-green-system-figure-green-and-calendar.md`](2026-06-25-green-system-figure-green-and-calendar.md) (PR 1) — dark data fills now flip to Brand Green 400 via `--chart-1`. The mono Frost/Paper/Ink base + flat aesthetic from this plan are **kept** — only the green changed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the FundaVida **app UI** to the locked "monochrome engineering blueprint with a green spark" direction validated in `prototypes/blueprint-skin.html`, by editing the token layer (CSS variables, fonts, radius) and the shadcn primitives — without changing any visible text, ARIA, or component markup.

**Architecture:** The codebase is token-driven: shadcn primitives consume semantic Tailwind colors (`bg-primary`, `bg-card`, `border`, `text-foreground`…) that resolve to OKLCH CSS variables in `src/index.css` (`:root` light + `.dark`). So the re-skin is driven almost entirely from `src/index.css` + `tailwind.config.ts` + font imports in `src/main.tsx` + a handful of primitive class tweaks (`button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `badge.tsx`) + two app surfaces that hardcode brand colors (`AppSidebar.tsx`, `NeedHelpCard.tsx`). Because markup and copy don't change, the existing 57 unit + 14 e2e suites are the regression net and **must stay green**; the acceptance check is visual parity with the prototype in the browser preview.

**Tech Stack:** React 18 · Vite · TypeScript · Tailwind v3 (`darkMode: ['class']`) · shadcn/ui (Radix + cva) · OKLCH design tokens · `@fontsource/*` self-hosted fonts · Vitest · Playwright.

---

## Source of truth & locked spec

The prototype `prototypes/blueprint-skin.html` boots into the final spec; `prototypes/NOTES.md` records it. Values to port:

| Concern                | Locked value                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Display/heading font   | **Inter Tight**, weight 600                                                                                 |
| Body/UI font           | **Inter**, weight 500 / 700                                                                                 |
| Headline register      | compressed — line-height ≤1.0, letter-spacing −0.02em at ≥36px                                              |
| Type scale             | display register ≈ 0.92× (page title ~40px, h1 ~31px, h2 ~20px, stat ~35px); body 16px / lh 1.4             |
| Accent green           | **electric `#7CFC00`** — scarce: primary actions / active nav / link underline only                         |
| Accent treatment       | **green-fill** buttons (Ink `#202020` text) + active nav green-fill                                         |
| Borders                | **soft `#e5e5e5`** 1px hairline (light) / `#2a2a2a` (dark) — _deliberately not_ the doc's `#202020`         |
| Radius                 | **12px** uniform (cards/buttons/inputs); pills 9999px                                                       |
| Spacing                | balanced-compact                                                                                            |
| Surfaces (light)       | canvas Frost `#f5f5f5` · card Paper `#ffffff` · text Ink `#202020` · 2nd Carbon `#333333` · muted `#6b6b6b` |
| Surfaces (dark, ships) | canvas `#161616` · card Ink `#202020` · text `#f5f5f5` · 2nd `#cfcfcf` · muted `#9a9a9a` · border `#2a2a2a` |
| Status                 | success `#22c55e` · error `#ef4444` (only non-mono colors)                                                  |
| Elevation              | **no shadows, no gradients** on in-flow cards/panels/buttons — depth = border + bg contrast                 |

**Three deliberate divergences from `docs/DESIGN.md`** (user's eye won in the prototype): radius **12** (doc says 8) · **soft** borders (doc says Ink hairline) · **compact** density (doc says comfortable). These are intentional — do not "correct" them back to the doc.

---

## OKLCH conversions (port these exact triplets; verify in browser — see Task 4.2)

The `:root`/`.dark` vars store raw `L C H` triplets consumed by `oklch(var(--x))`. Hex → OKLCH (approximate; confirm against prototype):

| Hex       | Role                  | `L C H` triplet |
| --------- | --------------------- | --------------- |
| `#7CFC00` | electric green        | `0.9 0.28 132`  |
| `#202020` | Ink (text / on-green) | `0.26 0 0`      |
| `#333333` | Carbon                | `0.36 0 0`      |
| `#6b6b6b` | muted text (light)    | `0.52 0 0`      |
| `#f5f5f5` | Frost canvas          | `0.96 0 0`      |
| `#f0f0f0` | hover frost           | `0.95 0 0`      |
| `#ffffff` | Paper card            | `1 0 0`         |
| `#e5e5e5` | soft border (light)   | `0.91 0 0`      |
| `#22c55e` | status success        | `0.73 0.18 149` |
| `#ef4444` | status error          | `0.64 0.21 25`  |
| `#161616` | dark canvas           | `0.2 0 0`       |
| `#cfcfcf` | dark 2nd text         | `0.84 0 0`      |
| `#9a9a9a` | dark muted            | `0.68 0 0`      |
| `#2a2a2a` | dark border / hover   | `0.3 0 0`       |

---

## File structure (what gets touched)

| File                                     | Responsibility         | Change                                                                                                                                                |
| ---------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                           | deps                   | + `@fontsource/inter`, `@fontsource/inter-tight`; − `@fontsource/geist-sans`, `@fontsource/instrument-serif` (keep `geist-mono` for `.font-mono` kbd) |
| `src/main.tsx`                           | font imports           | swap font CSS imports                                                                                                                                 |
| `src/index.css`                          | tokens + font families | recolor `:root` + `.dark`; repoint `body`/`.font-display`                                                                                             |
| `tailwind.config.ts`                     | radius scale + shadows | confirm `--radius`; flatten in-flow shadow utilities (optional cleanup)                                                                               |
| `src/components/ui/button.tsx`           | button variants        | green-fill default (Ink text), ghost = Ink border, link = green underline, uniform `rounded-lg`                                                       |
| `src/components/ui/card.tsx`             | card surface           | drop `shadow`, `rounded-xl`→`rounded-lg`                                                                                                              |
| `src/components/ui/input.tsx`            | input                  | `rounded-md`→`rounded-lg`                                                                                                                             |
| `src/components/ui/select.tsx`           | select trigger         | `rounded-md`→`rounded-lg`                                                                                                                             |
| `src/components/ui/badge.tsx`            | status pills           | success/error tuned to spec; neutral pill                                                                                                             |
| `src/components/dashboard/*`             | dashboard cards        | `shadow-card`→ flat (5 files)                                                                                                                         |
| `src/components/layout/AppSidebar.tsx`   | nav active state       | green-fill active item                                                                                                                                |
| `src/components/layout/NeedHelpCard.tsx` | sidebar card           | flatten green gradient → flat bordered                                                                                                                |

**Out of scope (accepts visual drift):** `src/pages/LandingPage.tsx` + `src/components/landing/*` (5 `.font-display` usages there will inherit the new font — that's fine, the user redoes the landing later).

---

## Phase 0 — Prototype & spec lock ✅ DONE

- [x] `prototypes/blueprint-skin.html` built, all axes tuned, final values locked.
- [x] Verdict captured in `prototypes/NOTES.md`.
- No tasks remain; this phase is the reference for Phases 1–4.

---

## Phase 1 — Foundation: fonts, tokens, radius

> Prerequisite (needs user approval per autonomy rules — **ask before running**): the font dependency swap in Task 1.1 installs/removes packages.

### Task 1.1: Swap font dependencies

**Files:**

- Modify: `package.json` (dependencies)
- Modify: `src/main.tsx:1-7`

- [ ] **Step 1: Install the new fonts, remove the old ones**

Run (after user approval):

```bash
npm install @fontsource/inter @fontsource/inter-tight
npm uninstall @fontsource/geist-sans @fontsource/instrument-serif
```

Expected: `package.json` gains `@fontsource/inter*`, loses `geist-sans`/`instrument-serif`. `@fontsource/geist-mono` stays.

- [ ] **Step 2: Swap the font imports in `src/main.tsx`**

Replace lines 1–7:

```ts
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
```

with:

```ts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter-tight/500.css'
import '@fontsource/inter-tight/600.css'
import '@fontsource/inter-tight/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
```

- [ ] **Step 3: Verify the build resolves the imports**

Run: `npm run typecheck && npm run build`
Expected: PASS, no "Cannot find module '@fontsource/...'" errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/main.tsx
git commit -m "chore: swap app fonts to Inter + Inter Tight for blueprint skin"
```

---

### Task 1.2: Repoint font families + display register

**Files:**

- Modify: `src/index.css:145-161`

- [ ] **Step 1: Repoint `body` and `.font-display`**

Replace the `body` and `.font-display` rules (lines 145–161):

```css
body {
  @apply bg-background text-foreground antialiased;
  font-feature-settings: 'cv11', 'ss01';
  font-family:
    'Geist Sans',
    system-ui,
    -apple-system,
    sans-serif;
}

.font-display {
  font-family: 'Instrument Serif', Georgia, serif;
}
```

with:

```css
body {
  @apply bg-background text-foreground antialiased;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
}

.font-display {
  font-family:
    'Inter Tight',
    system-ui,
    -apple-system,
    sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

Notes: drop the Geist `font-feature-settings` (Geist-specific). `.font-display` gets the compressed weight + tracking; line-height stays per-utility so small headings (`text-lg`) don't get cramped — large display sizes already use tight Tailwind leading. Per-element `font-normal`/`tracking-normal` utilities (e.g. `WelcomeBanner.tsx:48`) still win where present (utilities layer > base) — acceptable, leave them.

**Type scale (S = 0.92×):** the app has no single type-scale token — headings are sized per-utility (`PageHeader` uses `text-3xl`/`text-4xl` = 30/36px, dashboard heads `text-lg`). These already sit at/below the prototype's S targets (page title ~40px, h1 ~31px, h2 ~20px), so **no global resize is required** — the existing utilities satisfy "S". Do NOT enlarge any heading. If the user later wants the exact 0.92× multiplier, add a `--type-scale: 0.92` var and wrap the largest heading utilities in `text-[calc(...)]` — out of scope here (see Resolved Decisions #5).

- [ ] **Step 2: Verify in preview**

Reload `/prototypes/blueprint-skin.html` is unaffected; load the app (`/app`). Headings should render in Inter Tight, body in Inter.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: repoint app typography to Inter Tight + Inter"
```

---

### Task 1.3: Recolor light-mode semantic tokens

**Files:**

- Modify: `src/index.css:72-104` (the `:root` semantic block + `--radius`)

- [ ] **Step 1: Replace the light semantic token block**

Replace lines 72–103 (`/* Semantic tokens — light mode */` through `--ring: ...;`):

```css
/* Semantic tokens — light mode */
--background: var(--neutral-50);
--foreground: 0.18 0 0;
--card: 1 0 0;
--card-foreground: 0.18 0 0;
--popover: 1 0 0;
--popover-foreground: 0.18 0 0;
--primary: var(--brand-green-600);
--primary-foreground: 0.99 0.003 95;
--secondary: var(--brand-blue-500);
--secondary-foreground: 0.99 0.003 95;
--muted: var(--neutral-100);
--muted-foreground: var(--neutral-500);
--accent: var(--brand-green-50);
--accent-foreground: var(--brand-green-700);
--destructive: var(--flame-red-500);
--destructive-foreground: 0.99 0.003 95;
--success: var(--brand-green-500);
--warning: var(--flame-yellow-500);
--info: var(--brand-blue-500);
--border: var(--neutral-200);
--input: var(--neutral-200);
--ring: var(--brand-green-500);
```

with (blueprint light):

```css
/* Semantic tokens — light mode (blueprint: Frost/Paper/Ink + scarce green) */
--background: 0.96 0 0; /* Frost #f5f5f5 */
--foreground: 0.26 0 0; /* Ink #202020 */
--card: 1 0 0; /* Paper #ffffff */
--card-foreground: 0.26 0 0;
--popover: 1 0 0;
--popover-foreground: 0.26 0 0;
--primary: 0.9 0.28 132; /* electric green #7CFC00 */
--primary-foreground: 0.26 0 0; /* Ink text ON green */
--secondary: 0.26 0 0; /* Ink surface panel #202020 */
--secondary-foreground: 0.96 0 0; /* Frost text on Ink */
--muted: 0.96 0 0; /* Frost surface */
--muted-foreground: 0.52 0 0; /* muted #6b6b6b */
--accent: 0.95 0 0; /* hover frost #f0f0f0 (NOT green) */
--accent-foreground: 0.26 0 0; /* Ink */
--destructive: 0.64 0.21 25; /* error #ef4444 */
--destructive-foreground: 1 0 0;
--success: 0.73 0.18 149; /* success #22c55e */
--warning: 0.36 0 0; /* neutralized to mono (Carbon) — Resolved Decision #3 */
--info: 0.36 0 0; /* neutralized to mono (Carbon) */
--border: 0.91 0 0; /* soft #e5e5e5 */
--input: 0.91 0 0;
--ring: 0.26 0 0; /* Ink focus ring */
```

Key behavior: `--primary-foreground` flips to Ink so all text on green fills (`Button` default, `Badge` default, active nav) reads dark per spec. `--accent` becomes neutral Frost so ghost/hover states are _not_ green-tinted (keeps green scarce).

- [ ] **Step 2: Confirm `--radius` already equals 12px**

Line 103 reads `--radius: 0.75rem;` → `0.75rem = 12px` = the locked radius. **No change needed.** (`tailwind.config.ts` maps `lg: var(--radius)` = 12px; Task 2 repoints primitives to `rounded-lg`.)

- [ ] **Step 3: Verify in preview**

Run dev server; load `/app` in light mode. Canvas = Frost, cards = white with soft hairline, primary buttons = green with dark text.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: recolor light tokens to blueprint Frost/Paper/Ink + green"
```

---

### Task 1.4: Re-tune dark-mode tokens (Ink surface)

**Files:**

- Modify: `src/index.css:106-135` (the `.dark` block)

- [ ] **Step 1: Replace the dark semantic token block**

Replace the color assignments in `.dark` (lines 107–128, keep the `--chart-*` lines 130–134 as-is):

```css
--background: var(--neutral-950);
--foreground: var(--neutral-100);
--card: var(--neutral-900);
--card-foreground: var(--neutral-100);
--popover: var(--neutral-900);
--popover-foreground: var(--neutral-100);
--primary: var(--brand-green-400);
--primary-foreground: var(--neutral-950);
--secondary: var(--brand-blue-400);
--secondary-foreground: var(--neutral-950);
--muted: var(--neutral-800);
--muted-foreground: var(--neutral-400);
--accent: var(--brand-green-900);
--accent-foreground: var(--brand-green-200);
--destructive: var(--flame-red-400);
--destructive-foreground: var(--neutral-50);
--success: var(--brand-green-400);
--warning: var(--flame-yellow-400);
--info: var(--brand-blue-400);
--border: var(--neutral-800);
--input: var(--neutral-800);
--ring: var(--brand-green-400);
```

with (blueprint dark — Ink surface):

```css
--background: 0.2 0 0; /* dark canvas #161616 */
--foreground: 0.96 0 0; /* Frost text #f5f5f5 */
--card: 0.26 0 0; /* Ink card #202020 */
--card-foreground: 0.96 0 0;
--popover: 0.26 0 0;
--popover-foreground: 0.96 0 0;
--primary: 0.9 0.28 132; /* electric green (unchanged — pops on Ink) */
--primary-foreground: 0.26 0 0; /* Ink text ON green */
--secondary: 0.3 0 0; /* lighter Ink panel #2a2a2a */
--secondary-foreground: 0.96 0 0;
--muted: 0.24 0 0; /* subtle dark surface */
--muted-foreground: 0.68 0 0; /* dark muted #9a9a9a */
--accent: 0.3 0 0; /* hover #2a2a2a */
--accent-foreground: 0.96 0 0;
--destructive: 0.64 0.21 25; /* error #ef4444 */
--destructive-foreground: 0.96 0 0;
--success: 0.73 0.18 149; /* success #22c55e */
--warning: 0.84 0 0; /* neutralized to mono (light Carbon on Ink) — Resolved Decision #3 */
--info: 0.84 0 0; /* neutralized to mono */
--border: 0.3 0 0; /* soft dark border #2a2a2a */
--input: 0.3 0 0;
--ring: 0.96 0 0; /* light focus ring */
```

- [ ] **Step 2: Verify in preview (dark)**

In the app, toggle theme to dark (header theme toggle). Canvas `#161616`, cards Ink `#202020`, green pops, borders subtle.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: re-tune dark tokens to blueprint Ink surface"
```

---

## Phase 2 — Primitives: flatten, green-fill, uniform radius

### Task 2.1: Button — green-fill, Ink ghost border, uniform radius

**Files:**

- Modify: `src/components/ui/button.tsx:7-31`

- [ ] **Step 1: Update the cva base + variants**

In the base string (line 8), change `rounded-md` → `rounded-lg`:

```ts
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
```

Update the `variant` block (lines 11–18) — `default` already resolves to green-fill + Ink text via the retuned tokens; make `outline` a true 1px Ink-border ghost and `link` a green underline; bump button weight to 700 (Saans/Inter 700 per spec):

```ts
      variant: {
        default: 'bg-primary text-primary-foreground font-bold hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-foreground bg-transparent text-foreground hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:decoration-primary',
      },
```

And in `size` (lines 19–24) change the `sm`/`lg` `rounded-md` → `rounded-lg`:

```ts
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
```

Note: the trailing `→` arrow on primary CTAs is **content, not a variant** — do NOT bake it into the cva (would change markup the tests render). It stays a per-CTA choice (Resolved Decisions #1).

- [ ] **Step 2: Verify buttons render flat + green**

Run: `npm run typecheck && npm run lint`
Expected: PASS. In preview, primary buttons are flat green with Ink text, no shadow; outline buttons have a 1px Ink border.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "style: blueprint button — flat green-fill, Ink ghost, uniform radius"
```

---

### Task 2.2: Card — drop shadow, uniform radius

**Files:**

- Modify: `src/components/ui/card.tsx:8`

- [ ] **Step 1: Flatten the Card surface**

Replace line 8:

```ts
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
```

with:

```ts
      className={cn('rounded-lg border bg-card text-card-foreground', className)}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS. Cards show a 1px soft border, no drop shadow, 12px corners.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "style: flatten Card — hairline border, no shadow, 12px radius"
```

---

### Task 2.3: Flatten in-flow dashboard cards

**Files:**

- Modify: `src/components/dashboard/RecentActivity.tsx:44`
- Modify: `src/components/dashboard/TopCourses.tsx:16`
- Modify: `src/components/dashboard/AttendanceSnapshot.tsx:28`
- Modify: `src/components/dashboard/AdminDashboard.tsx:141`
- Modify: `src/components/dashboard/PendingApprovals.tsx:20`

- [ ] **Step 1: Remove `shadow-card` and normalize radius on each**

In each file, in the listed `className`, delete ` shadow-card` and change `rounded-xl` → `rounded-lg`. Example (`RecentActivity.tsx:44`):

```tsx
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card">
```

→

```tsx
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
```

Apply the same delete-`shadow-card` + `rounded-xl`→`rounded-lg` to `TopCourses.tsx:16`, `AttendanceSnapshot.tsx:28`, `AdminDashboard.tsx:141`, and `PendingApprovals.tsx:20` (PendingApprovals: only delete ` shadow-card`; keep its `rounded-xl`→`rounded-lg`).

- [ ] **Step 2: Confirm no other in-flow `shadow-card` remains**

Run: `grep -rn "shadow-card" src --include="*.tsx" | grep -v "/landing/"`
Expected: no output.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

```bash
git add src/components/dashboard/
git commit -m "style: flatten dashboard cards (no shadow, 12px radius)"
```

---

### Task 2.4: Input + Select — uniform radius

**Files:**

- Modify: `src/components/ui/input.tsx:11`
- Modify: `src/components/ui/select.tsx:22`

- [ ] **Step 1: Bump input/select trigger radius**

`input.tsx:11` and `select.tsx:22` — change `rounded-md` → `rounded-lg` in each trigger className. (Leave overlay content radius — `select.tsx:71` `rounded-md` — for the overlay decision in Task 2.6.) Border/focus already come from the retuned `--input`/`--ring` tokens.

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck`
Expected: PASS. Inputs and selects show soft border, Ink focus ring, 12px corners.

```bash
git add src/components/ui/input.tsx src/components/ui/select.tsx
git commit -m "style: uniform 12px radius on inputs and selects"
```

---

### Task 2.5: Badge — status pills to spec

**Files:**

- Modify: `src/components/ui/badge.tsx:11-22`

- [ ] **Step 1: Tune the status variants**

The `default` variant already becomes green-fill + Ink text via tokens. Retune `success`/`destructive` to soft tinted pills and keep `neutral`. Replace variants (lines 11–22):

```ts
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-900 dark:text-brand-green-200',
        warning:
          'border-transparent bg-flame-yellow-50 text-flame-yellow-700 dark:bg-flame-yellow-900 dark:text-flame-yellow-200',
        info: 'border-transparent bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-900 dark:text-brand-blue-200',
        neutral: 'border-transparent bg-muted text-muted-foreground',
```

with:

```ts
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-[oklch(0.64_0.21_25/0.4)] bg-[oklch(0.64_0.21_25/0.12)] text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.72_0.17_22)]',
        outline: 'border-border text-foreground',
        success:
          'border-[oklch(0.73_0.18_149/0.4)] bg-[oklch(0.73_0.18_149/0.14)] text-[oklch(0.52_0.16_149)] dark:text-[oklch(0.78_0.18_149)]',
        warning: 'border-border bg-muted text-foreground',
        info: 'border-border bg-transparent text-muted-foreground',
        neutral: 'border-border bg-transparent text-muted-foreground',
```

This matches the prototype's soft success/error pills and a bordered neutral pill. Per Resolved Decision #3, `warning`/`info` are **neutralized to mono** (bordered grey chips — distinguished by their label, not colour); `secondary` (line 13) resolves to the Ink panel via the retuned `--secondary` token.

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Status pills render as soft tinted green/red, neutral as a bordered chip.

```bash
git add src/components/ui/badge.tsx
git commit -m "style: blueprint status pills (soft success/error, bordered neutral)"
```

---

### Task 2.6: Overlay elevation — RESOLVED: keep (no-op)

Resolved Decision #2 = **keep** subtle overlay elevation. Floating layers (`dialog.tsx:42`, `dropdown-menu.tsx:47,66`, `select.tsx:71`, `command.tsx:39`) genuinely need to read as "above" the page; the doc's no-shadow rule targets in-flow cards/panels (already handled in Tasks 2.2, 2.3, 3.2). **No changes in this task** — left in the plan as an explicit confirmation so a future reader knows the overlay shadows are intentional, not missed.

---

### Task 2.7: Audit & neutralize stray non-mono semantic usages

**Files (UI/semantic layer only — NOT feature/data-viz; see Resolved Decision #3 deferral):**

- `src/components/ui/button.tsx:15` (`secondary` variant), `src/components/shared/UpcomingList.tsx:20-21` (`info`/`warning` colour map), and any `variant="secondary"` badges (`pages/TeachersDetailPage.tsx:81`, `pages/StudentsDetailPage.tsx:91`).

- [ ] **Step 1: List the semantic-layer usages**

Run: `grep -rnE 'variant="(secondary|info|warning)"|(text|bg|border)-(secondary|info|warning)' src --include="*.tsx" | grep -v "/landing/" | grep -v "__tests__"`
Expected: a short list (button/badge variants, UpcomingList, two detail-page secondary badges).

- [ ] **Step 2: Neutralize them**

- `UpcomingList.tsx:20-21` — replace the chromatic map values with mono:

```tsx
  info: 'text-muted-foreground bg-muted',
  warning: 'text-foreground bg-muted',
```

- The two `variant="secondary"` detail-page badges become heavy Ink chips via the retuned token — if that reads too strong next to body text, switch those two to `variant="neutral"` instead (verify in preview; pick whichever looks right).
- `button.tsx` `secondary` variant already resolves to the Ink panel via tokens — leave it; confirm no app primary action mistakenly uses `variant="secondary"` where it should be `default`.

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS (the 3 tests touching these classes may need an assertion update — fix inline if so).

```bash
git add -A && git commit -m "style: neutralize stray non-mono UI usages to monochrome"
```

> **NOT in scope here** (Resolved Decision #3 deferral → Phase 5): `reports/AttendanceHeatmap.tsx`, `certificates/CertificateCard.tsx`, `dashboard/PendingApprovals.tsx`, `shared/WelcomeBanner.tsx` sparkles, `pages/ReportsPage.tsx` chart line. Those are feature/data-viz colour decisions, not a token swap.

---

## Phase 3 — App surfaces: nav active state + sidebar card

### Task 3.1: Sidebar — green-fill active nav

**Files:**

- Modify: `src/components/layout/AppSidebar.tsx:48-72`

- [ ] **Step 1: Switch active item to green-fill**

Replace the `className` function + active accent bar + icon class (lines 48–72) so the active item is a solid green pill with Ink text (matching the prototype's `accent=fill` active nav), and drop the green left-rule:

```tsx
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary font-semibold text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground/70 group-hover:text-foreground'
            )}
          />
          <span className="truncate">{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
```

This removes the `absolute … bg-brand-green-600` left-rule span (lines 59–64) and the `isActive` ternary inside the children render that produced it. Net: active nav = green fill + Ink text/icon.

- [ ] **Step 2: Verify the active-state e2e/unit tests still pass**

Run: `npm run test -- AppSidebar && npm run typecheck`
Expected: PASS (tests assert `aria-current`/labels, not colors). If a test asserts the old `bg-brand-green-50` class, update the assertion to the new class — but first confirm it doesn't (grep `src/components/layout/__tests__/AppSidebar.test.tsx`).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "style: green-fill active nav item per blueprint spec"
```

---

### Task 3.2: NeedHelpCard — flatten gradient → bordered

**Files:**

- Modify: `src/components/layout/NeedHelpCard.tsx:9`

- [ ] **Step 1: Replace the green gradient + shadow with a flat bordered card**

Replace line 9:

```tsx
    <div className="m-3 mt-auto rounded-lg border border-brand-green-100 bg-gradient-to-br from-brand-green-50 via-background to-background p-4 shadow-sm dark:border-brand-green-500/20 dark:from-brand-green-500/10 dark:via-background dark:to-background">
```

with:

```tsx
    <div className="m-3 mt-auto rounded-lg border border-border bg-card p-4">
```

(Removes the gradient + shadow + green border per "no gradients/shadows"; the CTA inside stays green via the Button.)

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

```bash
git add src/components/layout/NeedHelpCard.tsx
git commit -m "style: flatten NeedHelpCard to bordered surface"
```

---

### Task 3.3: Optional cleanup — flatten Tailwind shadow utilities

**Files:**

- Modify: `tailwind.config.ts:110-116`

- [ ] **Step 1:** Neutralize the in-flow shadow utilities so any stray `shadow-card`/`shadow-soft`/`shadow-glow-*` becomes a no-op, while **keeping `elevated`** for the overlays we're intentionally not flattening (Resolved Decision #2):

```ts
      boxShadow: {
        soft: 'none',
        card: 'none',
        elevated: '0 10px 40px -10px rgba(0,0,0,0.10), 0 2px 10px -2px rgba(0,0,0,0.04)',
        'glow-primary': 'none',
        'glow-flame': 'none',
      },
```

First confirm scope: `grep -rn "shadow-soft\|shadow-glow" src --include="*.tsx" | grep -v landing`.

- [ ] **Step 2: Commit (if changed)**

```bash
git add tailwind.config.ts
git commit -m "style: neutralize unused elevation utilities"
```

---

### Task 3.4: Targeted density pass — data tables only

Resolved Decision #5 = **targeted** (tables only; NOT a global `p-6`→`p-4`).

**Files:**

- Modify: `src/components/ui/table.tsx:63` (`TableHead`) and `:77` (`TableCell`)

- [ ] **Step 1: Tighten table cell density toward the prototype (~row 7px·12px)**

`TableHead` (line 63) — `h-12 px-4` → `h-10 px-3`:

```tsx
      'h-10 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
```

`TableCell` (line 77) — `p-4` → `px-3 py-2`:

```tsx
    className={cn('px-3 py-2 align-middle [&:has([role=checkbox])]:pr-0', className)}
```

Do NOT touch global card padding (`p-6`) — the decision was tables-only.

- [ ] **Step 2: Verify nothing overflows + commit**

Run: `npm run typecheck && npm run e2e`
Expected: PASS (layout-only; e2e asserts rows/labels, not padding).

```bash
git add src/components/ui/table.tsx
git commit -m "style: tighten data-table density toward blueprint compact"
```

---

## Phase 4 — Verify & finalize

### Task 4.1: Full green-suite regression

- [ ] **Step 1: Run the whole quality gate**

Run:

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e && npm run i18n:check
```

Expected: all PASS. No copy/ARIA/role changed, so unit + e2e stay green; `i18n:check` passes (no locale edits). If any unit test asserts a brand color class (e.g. `bg-brand-green-50` on active nav from Task 3.1), update that single assertion to the new class and re-run.

- [ ] **Step 2: Commit any test-assertion fixups**

```bash
git add -A && git commit -m "test: align style assertions with blueprint classes"
```

### Task 4.2: Visual parity check (light + dark) against the prototype

- [ ] **Step 1: Preview-walk the key routes**

With the dev server running, load each in **light then dark**: `/app`, `/app/students`, `/app/reports`, `/app/certificates`, `/app/courses`. Open a dialog (e.g. command palette ⌘K) and a select dropdown.

- [ ] **Step 2: Sample computed colors and compare to prototype hexes**

In the preview, inspect a primary button, a card border, the canvas, and a status pill; confirm computed values match the prototype: green `rgb(124,252,0)`, Ink text `rgb(32,32,32)`, Frost canvas `rgb(245,245,245)`, soft border `rgb(229,229,229)`, dark card `rgb(32,32,32)`. If any OKLCH triplet renders off, nudge its `L C H` in `src/index.css` and re-check. Screenshot light + dark.

- [ ] **Step 3: Commit any token nudges**

```bash
git add src/index.css && git commit -m "style: fine-tune OKLCH values to match prototype hexes"
```

### Task 4.3: Regenerate social/README screenshots (follow-up)

- [ ] **Step 1:** Run `npm run screenshots` (manual, not CI-gated) to refresh README/OG images with the new skin. Review the diff, commit:

```bash
git add docs/ public/og-image.png README.md 2>/dev/null; git commit -m "chore: regenerate screenshots for blueprint skin"
```

### Task 4.4: Retire the prototype

- [ ] **Step 1:** Once the skin is merged and signed off, delete the prototype (its answer now lives in the real tokens):

```bash
git rm -r prototypes/
git commit -m "chore: remove blueprint-skin prototype (folded into tokens)"
```

Keep `docs/superpowers/plans/2026-06-03-blueprint-skin-ui.md` as the record.

---

## Guardrails (carry through every task)

- **No visible text / markup / ARIA changes.** Unit + e2e tests assert copy, roles, and labels — never classes/colors. A pure token/font/style change keeps them green; that green suite is the regression net.
- **One commit per task.** Conventional-commit prefixes (`style:`/`chore:`/`test:`). No `Co-Authored-By` trailers (per project memory).
- **Branch:** do this on a `feat/*` or `style/*` branch off the current branch; do not push or open a PR without explicit approval.
- **Dependency install (Task 1.1) needs approval** before running.
- **Keep green scarce.** Green only on: primary buttons, active nav, link underline, status-success. Hover/ghost/focus use Ink/Frost, never green tint.

## Resolved decisions (locked 2026-06-03)

1. **Primary-CTA `→` arrow → per-CTA content.** Do NOT bake the arrow into the `Button` cva (Task 2.1 stands). As a light follow-up, add `<ArrowRight className="size-4" />` inside _specific_ primary CTAs only (form submit buttons like "Create student", hero/primary-action buttons) — content, not a variant, so other buttons' markup/tests are untouched.
2. **Overlay shadows → keep.** Flatten only in-flow cards/panels (Tasks 2.2, 2.3, 3.2); leave dialog/dropdown/select/command elevation as-is (Task 2.6 no-op; Task 3.3 keeps `elevated`, neutralizes `soft`/`card`/`glow-*`).
3. **Extra colors → neutralize to mono.** `secondary`→Ink panel (Tasks 1.3/1.4); `warning`/`info` tokens + Badge variants → mono (Tasks 1.3, 1.4, 2.5); stray UI usages neutralized (Task 2.7).
   **Deferred → Phase 5 (separate feature-colour pass, NOT this re-skin):** flame-yellow/brand-blue also drive _feature & data-viz_ surfaces the prototype never covered. Recolouring a heatmap scale or an award accent is a design decision per-surface, not a token swap.
4. **Radius 12 + soft borders** — confirmed user choice; intentional divergence from `docs/DESIGN.md` (8px / Ink hairline).
5. **Type scale / density → targeted.** Existing heading sizes already satisfy "S" (no resize). Density = a targeted pass on data tables only (Task 3.4), not a global `p-6`→`p-4`.

---

## Phase 5 — Deferred: feature/data-viz colour audit (separate pass)

Not required for the token re-skin; sequence as its own session after Phases 1–4 land. Each surface is a per-surface design call (mono? green? keep a single accent?), not a mechanical token change.

| File                                                           | Current non-mono use                    | Question to resolve                                  |
| -------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `src/components/reports/AttendanceHeatmap.tsx:17,72`           | flame-yellow as a data-scale step       | Recolour the scale to a mono/green ramp              |
| `src/components/certificates/CertificateCard.tsx:60,62`        | flame-yellow award accent + ring        | Mono award accent, or keep one warm accent           |
| `src/components/dashboard/PendingApprovals.tsx:21,28,34,42,51` | flame-yellow "pending" emphasis + count | Mono, or use the status conventions                  |
| `src/components/shared/WelcomeBanner.tsx:36,40`                | flame-yellow sparkle dots               | Drop or recolour to green/Ink                        |
| `src/components/shared/UpcomingList.tsx:20-21`                 | info/warning colour map                 | (handled in Task 2.7 — listed here for completeness) |
| `src/pages/ReportsPage.tsx:76`                                 | brand-blue dashed chart line            | Mono/Ink or green                                    |

- [ ] Decide per surface, then implement + verify like Phases 2–3 (one commit each). Track separately from the core re-skin.

## Rollback

Each task is an isolated commit; `git revert <sha>` backs out any single step. The whole re-skin is confined to tokens + primitives + two app surfaces, so reverting the Phase-1 commits restores the previous look wholesale.
