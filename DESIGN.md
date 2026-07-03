---
name: FundaVida
description: Calm, structural educational management — a community ledger with one hopeful green
colors:
  figure-green: 'oklch(0.57 0.17 138)'
  figure-green-deep: 'oklch(0.5 0.16 138)'
  figure-green-vivid: 'oklch(0.7 0.17 138)'
  frost: 'oklch(0.96 0 0)'
  paper: 'oklch(1 0 0)'
  ink: 'oklch(0.26 0 0)'
  carbon-muted: 'oklch(0.52 0 0)'
  hairline: 'oklch(0.91 0 0)'
  dark-canvas: 'oklch(0.2 0 0)'
  error-red: 'oklch(0.64 0.21 25)'
  institutional-blue: 'oklch(0.51 0.19 260)'
  flame-yellow: 'oklch(0.85 0.17 90)'
typography:
  display:
    fontFamily: 'Inter Tight, system-ui, sans-serif'
    fontWeight: 600
    letterSpacing: '-0.02em'
  headline:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 500
    letterSpacing: '0.08em'
  mono:
    fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, monospace'
    fontSize: '0.875rem'
rounded:
  sm: '0.5rem'
  md: '0.625rem'
  lg: '0.75rem'
  xl: '1rem'
  '2xl': '1.5rem'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
components:
  button-primary:
    backgroundColor: '{colors.figure-green-deep}'
    textColor: 'oklch(0.99 0.003 95)'
    rounded: '{rounded.lg}'
    padding: '8px 16px'
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '8px 12px'
  card:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.xl}'
    padding: '24px'
  input:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    height: '40px'
  nav-link-active:
    backgroundColor: '{colors.figure-green-deep}'
    textColor: 'oklch(0.99 0.003 95)'
    rounded: '{rounded.lg}'
    padding: '8px 12px 8px 12px'
---

# Design System: FundaVida

## 1. Overview

**Creative North Star: "The Community Ledger"**

FundaVida is a well-kept record book for three community centers: every entry legible, every column ruled, nothing decorative between the reader and the record. The system is near-monochrome engineering restraint — Frost canvas, Paper surfaces, Ink text, hairline borders — with **Figure Green** (the logo green, hue 138) as the single chromatic voice. The green is scarce so it is semantically loud: it marks the primary action, the active nav entry, and moments of achievement (a passing Grade, an issued Certificate). Hope is carried by the green and the copy, never by ornament.

The system explicitly rejects (per PRODUCT.md): the reverted electric lime `#7CFC00`, SaaS dashboard clichés (gradient hero-metrics, identical icon-card grids, decorative glassmorphism), NGO-pastel softness, and duplicated affordances — one concept renders on one surface.

**Key Characteristics:**

- Flat, bordered, quietly confident — structure from hairlines, not shadows
- One accent (Figure Green) on ≤10% of any screen
- Light and dark themes from the same OKLCH triplet tokens
- Dense where the work is dense (tables, rosters); generous where it breathes (dashboards)
- Every string EN + ES; states (loading / empty / no-results) are part of every surface

## 2. Colors

A mono ramp doing the structure, one green doing the talking.

### Primary

- **Figure Green Deep** (`oklch(0.5 0.16 138)`, ≈`#2A8426`): the light-mode action color — filled buttons, active nav pill, focus rings ride the 500. AA-safe under off-white text.
- **Figure Green** (`oklch(0.57 0.17 138)`, ≈`#32982D`): the brand anchor (logo green); `success` semantic, chart series 1, light-mode focus ring.
- **Figure Green Vivid** (`oklch(0.7 0.17 138)`): dark-mode primary — pops on Ink, takes Ink text.

### Secondary (used sparingly)

- **Institutional Blue** (`oklch(0.51 0.19 260)`): the logo's second hue; a full ramp exists (`brand-blue-50…950`) but stays in reserve — identity moments only, never a competing UI accent.

### Tertiary (used sparingly)

- **Flame Yellow** (`oklch(0.85 0.17 90)`): the logo flame; celebration accents only. **Not** the warning color — warnings are mono (see Named Rules).
- **Error Red** (`oklch(0.64 0.21 25)`, ≈`#ef4444`): destructive actions and error states, both themes.

### Neutral

- **Frost** (`oklch(0.96 0 0)`, `#f5f5f5`): light canvas, muted surfaces, ghost hovers.
- **Paper** (`oklch(1 0 0)`, `#ffffff`): cards, popovers, inputs — the surface above Frost.
- **Ink** (`oklch(0.26 0 0)`, `#202020`): light-mode text; dark-mode card surface.
- **Carbon Muted** (`oklch(0.52 0 0)`, ≈`#6b6b6b`): secondary text, meta lines. Never for body copy.
- **Hairline** (`oklch(0.91 0 0)`, `#e5e5e5`): borders, dividers, inputs — the ledger's rules.
- **Dark Canvas** (`oklch(0.2 0 0)`, ≈`#161616`): dark-mode background; dark borders sit at `oklch(0.3 0 0)`.

### Named Rules

**The Scarce Green Rule.** Figure Green appears on at most 10% of any screen — the primary action, the active state, the achievement. If a screen reads green, it is shouting.
**The Mono Verdict Rule.** `warning` and `info` are deliberately neutralized to the mono ramp (Carbon light / light-Carbon dark). Only success (green) and error (red) get hue. Do not "fix" this by colorizing them.
**The One Green Rule.** The brand green is Figure Green, hue 138. `#7CFC00` is prohibited — it was the old blueprint skin's accent and was formally reverted.

## 3. Typography

**Display Font:** Inter Tight (with system-ui fallback) — 600, `-0.02em`
**Body Font:** Inter (with system-ui fallback)
**Label/Mono Font:** Geist Mono (with ui-monospace fallback)

**Character:** One humanist-grotesque family in two cuts — Inter for the record, Inter Tight for the headings above it — with a mono voice for anything counted. Structural, not decorative.

### Hierarchy

- **Display** (`.font-display`, 600, `-0.02em`): page titles via `PageHeader`; the only Inter Tight surface.
- **Headline** (600, `text-lg`, `tracking-tight`): section `h2`s ("Schedule", "Certificates").
- **Body** (400–500, `text-sm`): the workhorse — tables, forms, cards. Prose caps at 65–75ch.
- **Label** (500, `text-[11px]`, uppercase, `tracking-[0.08em]`): sidebar section headings, table meta. Muted foreground.
- **Mono** (Geist Mono, `tabular-nums`): hours, scores, counts, dates in tables.

### Named Rules

**The Tabular Numbers Rule.** Any number a user might compare down a column (hours, Grades, counts) renders in Geist Mono with `tabular-nums`, right-aligned.

## 4. Elevation

Flat by default. Depth is conveyed by borders and tonal layering — Paper above Frost in light, lighter Ink panels above Dark Canvas in dark — not by shadows. The shadow vocabulary was deliberately swept down to a single token; do not reintroduce per-component shadows.

### Shadow Vocabulary

- **elevated** (`box-shadow: 0 10px 40px -10px rgba(0,0,0,0.10), 0 2px 10px -2px rgba(0,0,0,0.04)`): reserved for true overlays (popovers, command palette). Never on resting cards.

### Named Rules

**The Hairline Rule.** If a surface needs separation, it gets a 1px Hairline border, not a shadow. Cards are `border` + `rounded-xl` + Paper, flat at rest.

## 5. Components

Flat, bordered, quietly confident. shadcn/Radix primitives skinned to the ledger; states over ornament.

### Buttons

- **Shape:** gently rounded (`rounded-lg`, 12px); `h-10 px-4` default, `h-9 px-3` small.
- **Primary:** Figure Green Deep fill, off-white text; hover darkens within the green ramp.
- **Outline:** transparent fill, 1px `border-foreground`, Ink text; hover washes Frost (`accent`). Used for secondary and toggle-style actions (session pickers, status selectors).
- **Ghost / Destructive:** ghost hovers Frost; destructive fills Error Red.
- **Focus:** 2px Figure Green ring (`--ring`), offset — both themes.

### Cards / Containers

- **Corner Style:** `rounded-xl` (16px); page-level bands `rounded-2xl`.
- **Background:** Paper (light) / Ink `#202020` (dark).
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px Hairline, always.
- **Internal Padding:** 24px (`p-6`); dense list rows 12–16px.

### Inputs / Fields

- **Style:** Paper fill, 1px Hairline border, `rounded-lg`, `h-10`; placeholder at muted-foreground.
- **Focus:** Figure Green ring, no border-color swap.
- **Error:** message text in Error Red below the field (react-hook-form + zod).

### Navigation

- **Sidebar:** grouped sections under uppercase Labels; items are `rounded-lg` rows with icon + label. **Active = filled Figure Green pill with off-white text** — the strongest green moment in the shell. Inactive = muted text, Frost hover. Derives from the permission matrix (ADR-0010) — never hand-edit per role.
- **Header:** breadcrumbs + ⌘K search + role switcher; mobile gets a drawer reusing the same nav derivation.

### DataTable (signature component)

Sortable ruled table on desktop; the same rows render as stacked cards on mobile (`renderCard`, dual-render — the desktop table hides at `sm:` via CSS, so both exist in the DOM). Pagination via `Pager`, count via `ListHeaderBand`. Status chips: success = green tint, everything else mono per the Mono Verdict Rule.

## 6. Do's and Don'ts

### Do:

- **Do** define every color as an OKLCH triplet custom property consumed via `oklch(var(--token))` — both themes flow from the same variables.
- **Do** keep Figure Green scarce: primary action, active nav, achievement — and stop there.
- **Do** separate surfaces with 1px Hairline borders and tonal layering; the single `elevated` shadow is for true overlays only.
- **Do** render comparable numbers in Geist Mono `tabular-nums`.
- **Do** route every string through i18next (EN + ES) and ship loading / empty / no-results states with every list; route motion through the motion seam (ADR-0027) with `prefers-reduced-motion` honored.
- **Do** give every interactive component its full state set: hover, focus-visible, active, disabled.

### Don't:

- **Don't** use `#7CFC00` — the electric lime is formally reverted; the brand green is Figure Green `#32982D` (hue 138).
- **Don't** build "SaaS dashboard clichés — hero-metric cards with gradient accents, identical icon-card grids, decorative glassmorphism" (PRODUCT.md, verbatim).
- **Don't** drift into "NGO-pastel softness — rounded pastel illustration-heavy charity aesthetics" (PRODUCT.md); warmth comes from copy and the green.
- **Don't** render the same concept twice on one screen with different chrome — "one surface per concept" (PRODUCT.md); the old Schedule / Mark-attendance wall is the named anti-pattern.
- **Don't** colorize `warning` or `info` — they are mono by decision (Resolved Decision #3).
- **Don't** add shadows to resting cards or side-stripe borders to list items; the ledger is flat and ruled.
