# FundaVida Brand Guidelines

**Version:** 2.0
**Last updated:** April 2026
**Scope:** Digital product (this web application), marketing surfaces, internal communications
**Supersedes:** `docs/brand_guidelines.md` (v1.0, carried from FundaVida-old)

This document is the canonical reference for FundaVida's visual and verbal identity as applied to the portfolio rearchitecture. It combines the original brand essence from the production platform with the expanded design system built for this portfolio-grade rebuild. Where v1.0 was a style guide, v2.0 is a design system.

---

## 1. Brand essence

[FundaVida](https://www.fundavida.org/) is a non-profit organization that empowers young Costa Ricans to break the destructive cycle of poverty through award-winning educational programs, operating in high-risk communities near San José (Concepción de Alajuelita, 25 de Julio, and Linda Vista de Patarrá).

- **Mission:** empower youth through award-winning programs to overcome violence, poverty, and school dropout.
- **Tagline:** _"La esperanza lo cambia todo."_ (_"Hope changes everything."_)
- **Personality:** warm, hopeful, trustworthy, community-driven, professional.
- **Primary audience (this product):** recruiters and technical reviewers evaluating the portfolio rebuild; secondarily, the original platform's administrators, teachers, and students.

### 1.1 This repo's relationship to the brand

This repository is a **portfolio rearchitecture**, not the production FundaVida platform. All data runs in the browser. No backend, no auth, no real records. The brand is applied faithfully because the point of the rebuild is to demonstrate how a real product can be rebuilt with portfolio-grade craft while honoring the original identity.

Where decisions diverge from production (bilingual EN/ES vs. Spanish-only, role switcher vs. Supabase auth), the portfolio version is called out explicitly in context.

---

## 2. Logo

The master logo is a **full lockup** combining a pictorial mark with the `fundavida` wordmark. It lives in this repository at [`public/logo.svg`](../../public/logo.svg).

### 2.1 Anatomy

1. **Two human figures** in Figure Blue and Figure Green — youth, community, partnership.
2. **A flame** in Flame Red and Flame Yellow — hope, passion, the "light" the programs bring.
3. **The wordmark** `fundavida` in Wordmark Black — anchors the mark.

### 2.2 Variants

| Variant                  | Use case                                                     | Min size                             |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------ |
| Full lockup (default)    | Landing hero, footer, marketing, print                       | 24 px tall (digital) / 15 mm (print) |
| Icon-only                | Favicon, tight spaces, app icons, small chips                | 16 px                                |
| Wordmark-only            | Monochrome contexts where the pictorial reads poorly at size | 20 px                                |
| Monochrome (flat black)  | Single-color print, embossing                                | Same as above                        |
| Reverse (white on brand) | Brand-colored backgrounds                                    | Same as above                        |

Render variants via the `LogoMark` component:

```tsx
<LogoMark variant="full" size="md" />
<LogoMark variant="icon" size="sm" />
<LogoMark variant="wordmark" size="md" className="text-foreground" />
```

### 2.3 Clear space

Always keep a minimum clear space around the logo equal to the **height of the lowercase `v` in `fundavida`**. Never allow other elements, images, or edges inside that zone.

### 2.4 Do

- Place the logo on white, off-white (`#FCFCFA`), or high-contrast photographic backgrounds.
- Use the full-color SVG whenever possible.
- Scale proportionally.
- Inside dark backgrounds, use the reverse variant — not the default lockup.

### 2.5 Don't

- Recolor the mark, the figures, or the flame individually.
- Rotate, skew, or distort.
- Add drop shadows, outlines, or effects.
- Place on low-contrast or busy backgrounds without a solid plate behind it.
- Reconstruct from other fonts or shapes.

---

## 3. Color system

### 3.1 Core palette (7 canonical brand colors)

Extracted directly from `public/logo.svg`. Unchanged from v1.0.

| Role                                | HEX       | RGB                  | OKLCH                  |
| ----------------------------------- | --------- | -------------------- | ---------------------- |
| Wordmark Black                      | `#111111` | `rgb(17, 17, 17)`    | `oklch(0.18 0 0)`      |
| Figure Blue (primary institutional) | `#2961CD` | `rgb(41, 97, 205)`   | `oklch(0.51 0.19 260)` |
| Figure Green (primary product)      | `#32982D` | `rgb(50, 152, 45)`   | `oklch(0.57 0.17 138)` |
| Flame Red                           | `#D20105` | `rgb(210, 1, 5)`     | `oklch(0.52 0.25 27)`  |
| Flame Yellow                        | `#FDCB02` | `rgb(253, 203, 2)`   | `oklch(0.85 0.17 90)`  |
| Off-white                           | `#FCFCFA` | `rgb(252, 252, 250)` | `oklch(0.99 0.003 95)` |
| Near-white                          | `#FEFEFE` | `rgb(254, 254, 254)` | `oklch(1.00 0 0)`      |

### 3.2 Tonal ramps (11 steps each, OKLCH-defined)

Each core color extends to an 11-step ramp. Steps are named `50` (lightest) through `950` (darkest), matching Tailwind convention. Ramps are defined in OKLCH for perceptual uniformity.

#### 3.2.1 Brand Green ramp (primary product color)

| Step | OKLCH                  | Approx HEX | Use                             |
| ---- | ---------------------- | ---------- | ------------------------------- |
| 50   | `oklch(0.97 0.02 138)` | `#F0FAEE`  | Subtle tint backgrounds         |
| 100  | `oklch(0.93 0.05 138)` | `#DCF2D6`  | Success pill background         |
| 200  | `oklch(0.87 0.09 138)` | `#BCE6B1`  | Hover state on success surfaces |
| 300  | `oklch(0.78 0.14 138)` | `#93D485`  | Disabled primary buttons        |
| 400  | `oklch(0.68 0.16 138)` | `#6BBE5C`  | Secondary accents               |
| 500  | `oklch(0.57 0.17 138)` | `#32982D`  | **Base — Figure Green**         |
| 600  | `oklch(0.50 0.16 138)` | `#2A8426`  | Primary button hover            |
| 700  | `oklch(0.42 0.14 138)` | `#236D1F`  | Active pressed state            |
| 800  | `oklch(0.34 0.11 138)` | `#1D5719`  | Dark-mode surfaces              |
| 900  | `oklch(0.26 0.08 138)` | `#164013`  | Dark-mode text emphasis         |
| 950  | `oklch(0.18 0.05 138)` | `#0F2C0D`  | Dark-mode deep backgrounds      |

#### 3.2.2 Brand Blue ramp (secondary / institutional)

| Step | OKLCH                  | Approx HEX | Use                        |
| ---- | ---------------------- | ---------- | -------------------------- |
| 50   | `oklch(0.97 0.02 260)` | `#EFF3FB`  | Info pill background       |
| 100  | `oklch(0.92 0.05 260)` | `#D8E2F5`  | Hover on info surfaces     |
| 200  | `oklch(0.84 0.10 260)` | `#AFC3ED`  | Secondary button hover     |
| 300  | `oklch(0.74 0.15 260)` | `#83A1E3`  | Chart secondary series     |
| 400  | `oklch(0.62 0.18 260)` | `#557DD6`  | Secondary accents          |
| 500  | `oklch(0.51 0.19 260)` | `#2961CD`  | **Base — Figure Blue**     |
| 600  | `oklch(0.44 0.18 260)` | `#2153AF`  | Info state emphasis        |
| 700  | `oklch(0.37 0.16 260)` | `#1A4391`  | Link visited               |
| 800  | `oklch(0.30 0.13 260)` | `#153474`  | Dark-mode surfaces         |
| 900  | `oklch(0.24 0.10 260)` | `#112657`  | Dark-mode emphasis         |
| 950  | `oklch(0.17 0.06 260)` | `#0C1938`  | Dark-mode deep backgrounds |

#### 3.2.3 Flame Red ramp (destructive / error)

| Step | OKLCH                 | Approx HEX | Use                           |
| ---- | --------------------- | ---------- | ----------------------------- |
| 50   | `oklch(0.97 0.02 27)` | `#FCF0EF`  | Destructive pill background   |
| 100  | `oklch(0.92 0.06 27)` | `#F8D9D5`  | Hover on destructive surfaces |
| 200  | `oklch(0.84 0.13 27)` | `#F3AEA5`  | Error field tint              |
| 300  | `oklch(0.72 0.21 27)` | `#ED7865`  | Subtle warnings               |
| 400  | `oklch(0.62 0.24 27)` | `#E04733`  | Destructive hover             |
| 500  | `oklch(0.52 0.25 27)` | `#D20105`  | **Base — Flame Red**          |
| 600  | `oklch(0.46 0.22 27)` | `#B30104`  | Destructive pressed           |
| 700  | `oklch(0.39 0.18 27)` | `#940103`  | Deep destructive              |
| 800  | `oklch(0.32 0.14 27)` | `#740103`  | Dark-mode destructive         |
| 900  | `oklch(0.25 0.10 27)` | `#560102`  | Dark-mode emphasis            |
| 950  | `oklch(0.17 0.06 27)` | `#380101`  | Dark-mode deep                |

#### 3.2.4 Flame Yellow ramp (accent / celebration / warning)

| Step | OKLCH                 | Approx HEX | Use                                           |
| ---- | --------------------- | ---------- | --------------------------------------------- |
| 50   | `oklch(0.98 0.02 90)` | `#FEFAE8`  | Warning pill background                       |
| 100  | `oklch(0.95 0.06 90)` | `#FEF1C0`  | Celebration tint                              |
| 200  | `oklch(0.92 0.11 90)` | `#FDE388`  | Warning surfaces                              |
| 300  | `oklch(0.90 0.15 90)` | `#FDD74F`  | Highlight moments                             |
| 400  | `oklch(0.87 0.16 90)` | `#FDD026`  | Pre-base hover                                |
| 500  | `oklch(0.85 0.17 90)` | `#FDCB02`  | **Base — Flame Yellow**                       |
| 600  | `oklch(0.75 0.16 90)` | `#DFB200`  | Warning emphasis                              |
| 700  | `oklch(0.63 0.14 90)` | `#BA9200`  | Text-on-yellow scenarios (use `#111` instead) |
| 800  | `oklch(0.50 0.11 90)` | `#8F7000`  | Dark-mode accent                              |
| 900  | `oklch(0.38 0.09 90)` | `#6B5300`  | Dark-mode emphasis                            |
| 950  | `oklch(0.25 0.06 90)` | `#453500`  | Dark-mode deep                                |

#### 3.2.5 Neutral ramp (cool gray, hue ~220)

| Step | OKLCH                   | Approx HEX | Use                                  |
| ---- | ----------------------- | ---------- | ------------------------------------ |
| 50   | `oklch(0.99 0.003 220)` | `#FCFDFE`  | Page background (light)              |
| 100  | `oklch(0.96 0.006 220)` | `#F3F5F8`  | Muted surfaces                       |
| 200  | `oklch(0.92 0.010 220)` | `#E4E8EF`  | Borders (light)                      |
| 300  | `oklch(0.86 0.015 220)` | `#CBD2DD`  | Disabled text                        |
| 400  | `oklch(0.70 0.020 220)` | `#97A1B1`  | Placeholder text                     |
| 500  | `oklch(0.55 0.025 220)` | `#6B7587`  | Muted foreground                     |
| 600  | `oklch(0.45 0.025 220)` | `#556070`  | Secondary text                       |
| 700  | `oklch(0.35 0.022 220)` | `#3F4957`  | Body text (slightly softer than 900) |
| 800  | `oklch(0.26 0.018 220)` | `#2C333F`  | Dark-mode surfaces                   |
| 900  | `oklch(0.18 0.015 220)` | `#1B212B`  | Dark-mode background                 |
| 950  | `oklch(0.13 0.012 220)` | `#12171F`  | Dark-mode deep backgrounds           |

### 3.3 Semantic tokens — light mode

Defined in `src/index.css` under `:root`. Every component references these, never raw ramp values.

| Token                      | Value (OKLCH)    | Maps to   | Purpose                                                                                                                       |
| -------------------------- | ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--background`             | Neutral 50       | `#FCFDFE` | Page background                                                                                                               |
| `--foreground`             | Wordmark Black   | `#111111` | Body text                                                                                                                     |
| `--card`                   | Near-white       | `#FEFEFE` | Card surfaces                                                                                                                 |
| `--card-foreground`        | Wordmark Black   | `#111111` | Card text                                                                                                                     |
| `--popover`                | Near-white       | `#FEFEFE` | Popover surfaces                                                                                                              |
| `--popover-foreground`     | Wordmark Black   | `#111111` | Popover text                                                                                                                  |
| `--primary`                | Brand Green 600  | `#2A8426` | Primary actions (WCAG-safe for off-white text; green 500 is the brand identity color reserved for `--ring` and chart accents) |
| `--primary-foreground`     | Off-white        | `#FCFCFA` | Text on primary                                                                                                               |
| `--secondary`              | Brand Blue 500   | `#2961CD` | Secondary actions, info                                                                                                       |
| `--secondary-foreground`   | Off-white        | `#FCFCFA` | Text on secondary                                                                                                             |
| `--muted`                  | Neutral 100      | `#F3F5F8` | Muted surfaces                                                                                                                |
| `--muted-foreground`       | Neutral 500      | `#6B7587` | Muted text                                                                                                                    |
| `--accent`                 | Brand Green 50   | `#F0FAEE` | Hover tints                                                                                                                   |
| `--accent-foreground`      | Brand Green 700  | `#236D1F` | Text on accent                                                                                                                |
| `--destructive`            | Flame Red 500    | `#D20105` | Destructive actions                                                                                                           |
| `--destructive-foreground` | Off-white        | `#FCFCFA` | Text on destructive                                                                                                           |
| `--success`                | Brand Green 500  | `#32982D` | Success states                                                                                                                |
| `--warning`                | Flame Yellow 500 | `#FDCB02` | Warnings (pair with `#111`)                                                                                                   |
| `--info`                   | Brand Blue 500   | `#2961CD` | Info states                                                                                                                   |
| `--border`                 | Neutral 200      | `#E4E8EF` | Borders, dividers                                                                                                             |
| `--input`                  | Neutral 200      | `#E4E8EF` | Input borders                                                                                                                 |
| `--ring`                   | Brand Green 500  | `#32982D` | Focus rings                                                                                                                   |

### 3.4 Semantic tokens — dark mode

Defined in `src/index.css` under `.dark`. Curated, not inverted.

| Token                      | Value            | Maps to                                                |
| -------------------------- | ---------------- | ------------------------------------------------------ |
| `--background`             | Neutral 950      | `#12171F`                                              |
| `--foreground`             | Neutral 100      | `#F3F5F8`                                              |
| `--card`                   | Neutral 900      | `#1B212B`                                              |
| `--card-foreground`        | Neutral 100      | `#F3F5F8`                                              |
| `--popover`                | Neutral 900      | `#1B212B`                                              |
| `--popover-foreground`     | Neutral 100      | `#F3F5F8`                                              |
| `--primary`                | Brand Green 400  | `#6BBE5C` (lighter — saturated green on dark vibrates) |
| `--primary-foreground`     | Neutral 950      | `#12171F`                                              |
| `--secondary`              | Brand Blue 400   | `#557DD6`                                              |
| `--secondary-foreground`   | Neutral 950      | `#12171F`                                              |
| `--muted`                  | Neutral 800      | `#2C333F`                                              |
| `--muted-foreground`       | Neutral 400      | `#97A1B1`                                              |
| `--accent`                 | Brand Green 900  | `#164013`                                              |
| `--accent-foreground`      | Brand Green 200  | `#BCE6B1`                                              |
| `--destructive`            | Flame Red 400    | `#E04733`                                              |
| `--destructive-foreground` | Neutral 50       | `#FCFDFE`                                              |
| `--success`                | Brand Green 400  | `#6BBE5C`                                              |
| `--warning`                | Flame Yellow 400 | `#FDD026`                                              |
| `--info`                   | Brand Blue 400   | `#557DD6`                                              |
| `--border`                 | Neutral 800      | `#2C333F`                                              |
| `--input`                  | Neutral 800      | `#2C333F`                                              |
| `--ring`                   | Brand Green 400  | `#6BBE5C`                                              |

### 3.5 Usage ratio (unchanged from v1.0)

A balanced layout:

- ~60% neutrals (backgrounds, surfaces)
- ~25% primary (brand green in this product — nav, CTAs, headers)
- ~10% secondary (brand blue — charts, info, supporting elements)
- ~5% flame accents (yellow for celebrations/warnings, red for destructive)

### 3.6 Chart palette (monochromatic brand ramps)

Replaces v1.0's off-brand `--chart-1` through `--chart-5` (which used purple `#B762E0` and pink `#E93D7C` — not tied to brand).

Categorical series in order:

| Token       | Light                      | Dark                       | Source         |
| ----------- | -------------------------- | -------------------------- | -------------- |
| `--chart-1` | Brand Green 500 `#32982D`  | Brand Green 400 `#6BBE5C`  | Primary        |
| `--chart-2` | Brand Blue 500 `#2961CD`   | Brand Blue 400 `#557DD6`   | Secondary      |
| `--chart-3` | Flame Yellow 500 `#FDCB02` | Flame Yellow 400 `#FDD026` | Accent         |
| `--chart-4` | Brand Green 700 `#236D1F`  | Brand Green 300 `#93D485`  | Primary deep   |
| `--chart-5` | Brand Blue 700 `#1A4391`   | Brand Blue 300 `#83A1E3`   | Secondary deep |

Principles:

- Use in this order for consistency across pages.
- Never reach for off-brand hues (purples, pinks, teals) for categorical data.
- Sequential (heatmaps, choropleths) use a single ramp (typically green or blue).
- Diverging scales use green ↔ red.

---

## 4. Typography

Three-font system, self-hosted via `@fontsource/*` packages.

### 4.1 Families

| Font             | Family                                                  | Usage                                   | Fallback stack                            |
| ---------------- | ------------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Geist Sans       | `'Geist Sans', system-ui, -apple-system, sans-serif`    | All admin UI, body copy, labels, tables | system-ui → -apple-system → sans-serif    |
| Instrument Serif | `'Instrument Serif', Georgia, serif`                    | **Landing hero headline only**          | Georgia → serif                           |
| Geist Mono       | `'Geist Mono', ui-monospace, SFMono-Regular, monospace` | Stat numbers, timestamps, IDs, code     | ui-monospace → SFMono-Regular → monospace |

### 4.2 Weights

- Geist Sans: **400** (regular), **500** (medium), **600** (semibold). 700+ reserved for display moments.
- Instrument Serif: **400** regular + **400 italic**. No other weights.
- Geist Mono: **400**, **500**.

### 4.3 Type scale

Extends Tailwind defaults. Pixel values at 1rem = 16px.

| Token       | Size  | Line height | Weight                 | Usage                           |
| ----------- | ----- | ----------- | ---------------------- | ------------------------------- |
| `text-xs`   | 12 px | 16 px       | 400                    | Table footers, form help text   |
| `text-sm`   | 14 px | 20 px       | 400                    | Labels, sidebar nav, table body |
| `text-base` | 16 px | 24 px       | 400                    | Body paragraphs                 |
| `text-lg`   | 18 px | 28 px       | 500                    | Card headings, section leads    |
| `text-xl`   | 20 px | 28 px       | 500                    | Page section headings           |
| `text-2xl`  | 24 px | 32 px       | 600                    | Page titles (H2)                |
| `text-3xl`  | 30 px | 36 px       | 600                    | Dashboard greeting              |
| `text-4xl`  | 36 px | 40 px       | 600                    | Landing section headlines       |
| `text-5xl`  | 48 px | 1           | 400 (Instrument Serif) | Landing secondary hero          |
| `text-6xl`  | 60 px | 1           | 400 (Instrument Serif) | Landing hero (mobile)           |
| `text-7xl`  | 72 px | 1           | 400 (Instrument Serif) | Landing hero (desktop)          |

### 4.4 OpenType features

Enable for Geist Sans globally in `src/index.css`:

```css
body {
  font-feature-settings: 'cv11', 'ss01';
}
```

- `cv11` — single-story lowercase `a` (more neutral, less quirky).
- `ss01` — modernized lowercase `g`.

### 4.5 Self-hosting

Add to `package.json` devDependencies:

```json
"@fontsource/geist-sans": "^5.x",
"@fontsource/geist-mono": "^5.x",
"@fontsource/instrument-serif": "^5.x"
```

Import the subsets actually used in `src/main.tsx`:

```ts
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
```

No runtime font download, no FOUT, no Google Fonts network dependency.

---

## 5. Spacing

### 5.1 Scale

4pt baseline, matching Tailwind defaults. All component padding, margin, and gap values snap to this scale.

| Token | Value      | Pixels |
| ----- | ---------- | ------ |
| `0.5` | `0.125rem` | 2      |
| `1`   | `0.25rem`  | 4      |
| `1.5` | `0.375rem` | 6      |
| `2`   | `0.5rem`   | 8      |
| `3`   | `0.75rem`  | 12     |
| `4`   | `1rem`     | 16     |
| `5`   | `1.25rem`  | 20     |
| `6`   | `1.5rem`   | 24     |
| `8`   | `2rem`     | 32     |
| `10`  | `2.5rem`   | 40     |
| `12`  | `3rem`     | 48     |
| `16`  | `4rem`     | 64     |
| `20`  | `5rem`     | 80     |
| `24`  | `6rem`     | 96     |

### 5.2 Component spacing rules

| Element          | Padding                                           | Gap (between siblings)             |
| ---------------- | ------------------------------------------------- | ---------------------------------- |
| Button (default) | `px-4 py-2`                                       | —                                  |
| Button (lg)      | `px-6 py-3`                                       | —                                  |
| Button icon-only | `p-2`                                             | —                                  |
| Input            | `px-3 py-2`                                       | —                                  |
| Card             | `p-6` (default), `p-4` (compact), `p-8` (feature) | —                                  |
| Table cell       | `px-4 py-3`                                       | —                                  |
| Table row        | height 48 px                                      | —                                  |
| Dialog           | `p-6`                                             | `gap-4` between header/body/footer |
| Sidebar item     | `px-3 py-2`                                       | `gap-1` between items              |
| Sidebar section  | —                                                 | `gap-4` between sections           |
| Page container   | `px-6 lg:px-10`                                   | —                                  |
| `PageHeader`     | `py-6 lg:py-8`                                    | `gap-2` (title ↔ description)      |

### 5.3 Responsive spacing

- Below `sm` (640 px): halve page-container horizontal padding (`px-4`).
- Above `xl` (1280 px): maintain `px-10`.
- Dashboard stat-card row: `gap-4` mobile, `gap-6` desktop.
- Bento grid: `gap-4` always.

---

## 6. Radius, shadow, elevation

### 6.1 Radius

Defined in `src/index.css`:

```css
--radius: 0.75rem; /* 12px */
```

Derived sizes:

| Token          | Value | Use                                              |
| -------------- | ----- | ------------------------------------------------ |
| `rounded-sm`   | 6 px  | Badges, pills, small chips                       |
| `rounded-md`   | 10 px | Inputs, secondary buttons                        |
| `rounded-lg`   | 12 px | **Default** — buttons, cards, dialogs            |
| `rounded-xl`   | 16 px | Feature cards, hero cards                        |
| `rounded-2xl`  | 24 px | Feature-photo containers, stat-card hero variant |
| `rounded-full` | —     | Avatars, circular icon buttons                   |

### 6.2 Shadow scale

| Class                 | Definition                                                             | Use                                |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `shadow-soft`         | `0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)`  | Subtle elevation on large surfaces |
| `shadow-card`         | `0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)`     | **Default** for cards, list items  |
| `shadow-elevated`     | `0 10px 40px -10px rgba(0,0,0,0.10), 0 2px 10px -2px rgba(0,0,0,0.04)` | Modals, popovers, dropdowns        |
| `shadow-glow-primary` | `0 8px 24px -8px oklch(0.57 0.17 138 / 0.35)`                          | Primary button hover               |
| `shadow-glow-flame`   | `0 8px 24px -8px oklch(0.85 0.17 90 / 0.40)`                           | Celebration moments                |

Dark mode: shadow opacity increases ~1.5× to remain visible against deep backgrounds.

### 6.3 Elevation principles

- Surface (no shadow) — 0. Page background.
- Card — `shadow-card`. Primary content containers.
- Elevated — `shadow-elevated`. Floating UI (modals, popovers, dropdowns).
- Glow — `shadow-glow-*`. Interaction feedback only, never static.

---

## 7. Motion

### 7.1 Library

**Framer Motion** (`framer-motion@^12`) for all orchestrated animation. Tailwind's native keyframe animations remain for cheap cases (pulse, spin on skeleton shimmer).

### 7.2 Duration and easing

| Duration | Easing        | Use                               |
| -------- | ------------- | --------------------------------- |
| 150 ms   | `ease-out`    | Hover states, icon swaps          |
| 200 ms   | `ease-out`    | Fade-in, subtle reveals           |
| 250 ms   | `ease-out`    | Scale-in (0.96 → 1)               |
| 300 ms   | `ease-out`    | Fade-up (8 px travel)             |
| 400 ms   | `ease-in-out` | Page/route transitions            |
| 60 ms    | —             | Stagger interval between siblings |

Nothing above 400 ms. Respect `prefers-reduced-motion` at every entry.

### 7.3 Presets (defined in `src/lib/motion.ts`)

```ts
import type { Variants, Transition } from 'framer-motion'

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const transitionDefaults: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1], // ease-out-cubic
}
```

### 7.4 Route transitions

Wrap the admin router in `AnimatePresence` with `mode="wait"`:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    exit="hidden"
    transition={transitionDefaults}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### 7.5 Scroll reveals (landing)

```tsx
<motion.section
  variants={fadeUp}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.3 }}
  transition={transitionDefaults}
>
  ...
</motion.section>
```

### 7.6 Reduced motion

Set at the provider level in `src/main.tsx`:

```tsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

Additional guards for CSS-driven animation (aurora, marquee, float):

```css
@media (prefers-reduced-motion: reduce) {
  .aurora,
  .marquee,
  .float {
    animation: none;
  }
}
```

### 7.7 Anti-patterns

- Don't bounce. No `ease-out-back` or spring physics in UI animation.
- Don't over-stagger. `staggerChildren` > 100 ms reads as slow.
- Don't animate pointer-cursor state changes.
- Don't animate layout shifts on load (use skeleton matching final shape).
- Don't loop attention-getting animations longer than 4 s (use `pulse-soft` max).

---

## 8. Iconography

### 8.1 Primary set — Lucide

`lucide-react` is the app's UI icon library. ~40–60 icon usages expected across admin.

Sizing conventions:

| Size         | Pixel | Use                                   |
| ------------ | ----- | ------------------------------------- |
| `size={14}`  | 14    | Inline text icons, table action menus |
| `size={16}`  | 16    | Button icons, form decorations        |
| `size={20}`  | 20    | Sidebar nav, header                   |
| `size={24}`  | 24    | Feature cards, empty-state badges     |
| `size={32}+` | 32+   | Hero accents, stat-card decoration    |

Stroke weight: default (`strokeWidth={2}`). For visual breathing room at ≥ 24px, drop to `1.5`.

Always set `aria-hidden="true"` on decorative icons; provide `aria-label` on interactive icon-only buttons.

### 8.2 Custom flame-motif set

Six icons riffing on the brand flame, for brand/celebration moments. Live in `src/components/icons/flame/`.

| Icon                | File                   | Use                                                 |
| ------------------- | ---------------------- | --------------------------------------------------- |
| `flame-hope`        | `FlameHope.tsx`        | Landing hero accent, large feature decoration       |
| `flame-certificate` | `FlameCertificate.tsx` | Certificate issued, certificate empty state         |
| `flame-milestone`   | `FlameMilestone.tsx`   | Achievement unlocked, stat-card celebration variant |
| `flame-welcome`     | `FlameWelcome.tsx`     | Dashboard WelcomeBanner illustration                |
| `flame-empty`       | `FlameEmpty.tsx`       | Generic empty-state accent                          |
| `flame-celebration` | `FlameCelebration.tsx` | Toast success decoration, celebration moments       |

Each icon is hand-drafted in Figma, exported as optimized SVG, wrapped in a React component:

```tsx
export function FlameHope({ size = 24, className, ...rest }: SVGProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...rest}>
      ...
    </svg>
  )
}
```

Icons inherit `currentColor`. For multi-color brand renderings, pass `className="text-[var(--flame-red)]"` or compose via gradients defined inline in the SVG.

### 8.3 Icon selection rules

- Prefer Lucide for UI (nav, buttons, form, statuses).
- Use flame icons only for brand/emotional moments — never as generic UI.
- Never mix Lucide and flame icons in the same visual group.
- Never use emoji as UI icons (except the 👋 greeting in the WelcomeBanner, which is intentional).

---

## 9. Illustration

### 9.1 Style

3D isometric with soft shadows, brand-colored palette, subtle gradient fills. Inspired by Learnthru's book illustration. Hand-drafted where custom, recolored where sourced.

### 9.2 Sources and fallback hierarchy

1. **Custom Figma-drafted SVG** — hero illustration for landing, 6 empty-state scenes. One-time design investment.
2. **unDraw** (undraw.co) — scene illustrations, recolored to brand green or brand blue per context.
3. **Blush.design** / **Humaaans** — avatars, people illustrations, recolored.
4. **Noun Project** — icon-style spot illustrations if needed, with proper attribution.

Never use: generic stock illustration packs with `-illustration-1.png` filenames, AI-generated illustrations that don't respect brand palette.

### 9.3 Recoloring open-source illustrations

1. Open SVG in Figma or text editor.
2. Identify fill colors.
3. Map to brand ramp:
   - Primary subject → brand green 500
   - Secondary subject → brand blue 500
   - Accent/highlight → flame yellow 500
   - Neutrals → neutral 100–400
4. Verify contrast against target background.
5. Export optimized SVG (`npx svgo`).

### 9.4 Dark-mode variants

Hero illustrations and empty-state SVGs have dark-mode variants. Implementation: dual exports switched by a media query inside the SVG itself.

```svg
<svg>
  <style>
    .bg-fill { fill: #FEFEFE; }
    @media (prefers-color-scheme: dark) {
      .bg-fill { fill: #1B212B; }
    }
  </style>
  <rect class="bg-fill" ... />
</svg>
```

Prefer this over JS-driven theme switching — no flash, no runtime cost.

### 9.5 Usage rules

- Empty states: always illustrated, never bare text.
- Hero illustration: one per major surface (landing hero, dashboard welcome banner).
- Don't overdecorate. A list page with an illustration in its empty state + nothing else is correct.
- Illustrations in marketing surfaces (landing) can be animated; admin illustrations stay static.

---

## 10. Photography

**Status: deferred.** This section stubs out future photography stance for when FundaVida community photos are licensed.

### 10.1 Anticipated stance

- Real photos of FundaVida programs, students, classrooms (with proper releases).
- Warm color grading, natural light, no over-saturation.
- Square and 4:3 aspect ratios for cards; 16:9 for hero.
- Tonal treatment: consider brand-green or brand-blue duotone for program-section headers.

### 10.2 Not yet wired

Until photos are available, use brand illustrations only. Do not substitute with stock photography.

---

## 11. Layout and grid

### 11.1 Max content width

1440 px, centered. Admin pages and landing both respect this.

### 11.2 Breakpoints

Standard Tailwind:

| Breakpoint | Width   | Target                                  |
| ---------- | ------- | --------------------------------------- |
| `sm`       | 640 px  | Small tablets                           |
| `md`       | 768 px  | Tablets                                 |
| `lg`       | 1024 px | Small desktops, large tablets landscape |
| `xl`       | 1280 px | Desktops                                |
| `2xl`      | 1536 px | Large desktops                          |

Right panel on dashboard hides below `xl`; command palette available on all sizes.

### 11.3 Three-zone admin layout

```
┌──────────┬──────────────────────────────┬───────────┐
│          │ Header (56px)                │           │
│ Sidebar  ├──────────────────────────────┤  Right    │
│ 240px    │                              │  panel    │
│ →        │ Main                         │  280px    │
│ 64px     │ (max-w-[1440px], centered)   │  (xl+)    │
│          │                              │           │
│          │                              │           │
└──────────┴──────────────────────────────┴───────────┘
```

### 11.4 Bento grid rules

- Use for: Dashboard overview, Reports module.
- Cells snap to a 12-column grid.
- Common layouts: 2×2 (4 cells), 3×2 (6 cells), 4×3 (12 cells with some spans).
- Large cells span `col-span-2 row-span-1` or `col-span-2 row-span-2`.
- Minimum cell size 240 px wide, 160 px tall.
- `gap-4` between cells.

### 11.5 Landing layout

- Full-bleed sections (no max-width constraint on background).
- Content within sections respects 1440 px max-width + `px-6 lg:px-10` side padding.
- Hero is two-column on desktop (55% text / 45% illustration), stacked on mobile.

---

## 12. Component patterns

Canonical spec for the component library. All components use tokens (never raw values).

### 12.1 Buttons

Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`.
Sizes: `sm`, `default`, `lg`, `icon`.

```tsx
<Button variant="default">Agregar estudiante</Button>
<Button variant="destructive">Eliminar</Button>
<Button variant="ghost" size="icon"><XIcon /></Button>
```

Primary button hover adds `shadow-glow-primary`. Destructive hover deepens to flame-red 600.

### 12.2 Inputs

- Default border: `--input` (neutral 200).
- Focus ring: 2 px `--ring` (brand green 500).
- Error state: border `--destructive`, error message below.

### 12.3 Cards

Variants: `default`, `gradient-primary`, `gradient-flame`, `gradient-blue`, `elevated`.

```tsx
<Card>
  <CardHeader><CardTitle>Estudiantes</CardTitle></CardHeader>
  <CardContent>...</CardContent>
</Card>

<Card variant="gradient-primary">
  <WelcomeBanner />
</Card>
```

### 12.4 Tables

- Row height 48 px.
- Header: `bg-muted/50`.
- Hover: `bg-muted/40`.
- Numeric columns: right-aligned, Geist Mono.
- Status-pill column: soft-tinted `Badge` variants.
- Avatar-stack column: `AvatarStack` component.
- Action column: right-aligned `DropdownMenu` with chevron.
- Sticky header on scroll.

### 12.5 Dialogs / Sheets / Drawers

- Overlay: `bg-black/50 backdrop-blur-sm`.
- Content: `shadow-elevated`, `rounded-lg`, Framer Motion fade+scale entrance.
- Close button: top-right, icon-only.
- Keyboard: `Escape` closes; focus trapped.

### 12.6 Dropdowns and popovers

**Global defaults set in component primitives:**

```tsx
// src/components/ui/dropdown-menu.tsx
<DropdownMenuPrimitive.Content collisionBoundary="viewport" align="end" sideOffset={4} {...props} />
```

Action menus anchor to the trigger. Open downward when room, upward when not. **Never obscure the active table row.**

### 12.7 Toasts (Sonner)

Variants repainted to brand:

| Variant | Background                      | Icon            | Text           |
| ------- | ------------------------------- | --------------- | -------------- |
| Success | `--success` (brand green 500)   | `CheckCircle`   | Off-white      |
| Error   | `--destructive` (flame red 500) | `XCircle`       | Off-white      |
| Warning | `--warning` (flame yellow 500)  | `AlertTriangle` | Wordmark black |
| Info    | `--info` (brand blue 500)       | `Info`          | Off-white      |

Duration: 4 s default, 6 s for error. Swipe to dismiss.

### 12.8 Status pills

New `Badge` variants (soft tinted background + saturated foreground, optional dot):

```tsx
<Badge variant="success" dot>Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="destructive" dot>Inactivo</Badge>
```

### 12.9 Empty states

```tsx
<EmptyState
  illustration={<FlameEmpty size={240} />}
  heading="Aún no hay estudiantes"
  body="Agrega el primero para comenzar."
  action={<Button>Agregar estudiante</Button>}
/>
```

Never render a bare "No results" — every empty state has illustration + heading + body + CTA.

### 12.10 Skeletons

Replace spinners. Match the final component's shape:

```tsx
{
  isLoading ? <SkeletonTable rows={8} /> : <Table data={data} />
}
{
  isLoading ? <SkeletonStatCard /> : <StatCard data={stat} />
}
```

Shimmer animation uses `pulse-soft` (2 s infinite).

---

## 13. Data visualization

### 13.1 Chart palette

See §3.6. Monochromatic brand ramps, not arbitrary categorical colors.

### 13.2 Chart types by use

| Use case                             | Chart type                                                   |
| ------------------------------------ | ------------------------------------------------------------ |
| Trend over time                      | Line, with soft area fill                                    |
| Category comparison                  | Horizontal bar (better readability than vertical for labels) |
| Part of whole (≤ 5 categories)       | Donut (not pie)                                              |
| Progress toward target               | Progress ring                                                |
| Density over 2D (attendance heatmap) | Grid of cells (cal-heatmap style)                            |
| Big numeric display                  | Stat card with sparkline                                     |

### 13.3 Principles

- Always include axis labels + units.
- Never rely on color alone — pair with line weights, patterns, or direct labels.
- Line charts: active series 2 px, reference series 1 px dashed.
- Area fills: 15% opacity of the line color.
- Donuts: inner radius 60% of outer, center label for total.
- Legends: top or right, never bottom on mobile.
- Empty chart: show ghosted axes + centered "Sin datos en este rango" message.

### 13.4 Library

Charts implemented via **Recharts** (already a common shadcn pairing). Prefer `<ResponsiveContainer>` wrapping to respect parent width.

### 13.5 Dark-mode specifics

- Line weights heavier (2.5 px active) — dark backgrounds absorb thin lines.
- Fill opacity reduced (10% instead of 15%).
- Grid lines lower opacity (`neutral 800 @ 50%`).
- Legend text: `--muted-foreground`.

---

## 14. Voice and tone

### 14.1 Bilingual — EN and ES

This product is bilingual. v1.0 of this doc specified Spanish-only; v2.0 corrects that. Every user-facing string exists in both `en.json` and `es.json`. `npm run i18n:check` enforces parity in CI.

The brand personality is the same in both languages: warm, hopeful, trustworthy, empowering. Tone shifts only when the language demands (formal `usted` in Spanish for certificates and emails; neutral-formal English by default).

### 14.2 Principles

- **Warm, not clinical.** Speak to students, families, and teachers — not to administrators of a database.
- **Clear, never jargon-heavy.** Plain language over technical terms.
- **Empowering.** Frame actions around student outcomes: "Matricular estudiante" / "Enroll student", not "Create record".
- **Respectful and inclusive.** `usted` in formal Spanish flows (emails, certificates), `tú` in conversational microcopy where audience warrants. English defaults to neutral-formal ("Enroll a student" not "Create one").
- **Consistent terminology.** Use the domain vocabulary defined in the original project overview (matrícula, sede, adecuación educativa, TCU). Don't invent synonyms.

### 14.3 Message types

| Type         | Tone                               | ES example                                                                              | EN example                                                                                      |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Success      | Celebratory, brief                 | "Matrícula creada con éxito."                                                           | "Enrollment created successfully."                                                              |
| Error        | Calm, specific, actionable         | "No se pudo guardar la nota. Revisa la conexión e inténtalo de nuevo."                  | "Couldn't save the grade. Check your connection and try again."                                 |
| Empty        | Encouraging, next-step             | "Aún no hay estudiantes en este curso. Agrega el primero para comenzar."                | "No students yet in this course. Add the first one to get started."                             |
| Confirmation | Neutral, clear about consequence   | "¿Seguro que deseas retirar esta matrícula? Esta acción se registrará en la auditoría." | "Are you sure you want to drop this enrollment? This action will be logged in the audit trail." |
| Destructive  | Direct, reversible-or-not explicit | "Esta acción no se puede deshacer."                                                     | "This action can't be undone."                                                                  |

### 14.4 Anti-patterns

- "Oops!" — too casual, clinical-avoidance cliché.
- "Something went wrong" without specifics.
- "Great job!" without context.
- Exclamation marks on every success ("Saved!" "Done!" "Great!"). One per message max.
- Jargon in user-facing strings ("entity", "record", "instance", "endpoint").

---

## 15. Accessibility

### 15.1 Contrast matrix (WCAG 2.1 AA)

| Foreground            | Background                           | Ratio | Verdict            |
| --------------------- | ------------------------------------ | ----- | ------------------ |
| Wordmark Black `#111` | Off-white `#FCFCFA`                  | 19.1  | AAA                |
| Off-white `#FCFCFA`   | Brand Green 500 `#32982D`            | 3.8   | AA large text only |
| Off-white `#FCFCFA`   | Brand Green 600 `#2A8426`            | 4.6   | AA normal          |
| Off-white `#FCFCFA`   | Brand Blue 500 `#2961CD`             | 5.4   | AA normal          |
| Off-white `#FCFCFA`   | Flame Red 500 `#D20105`              | 5.9   | AA normal          |
| Wordmark Black `#111` | Flame Yellow 500 `#FDCB02`           | 13.5  | AAA                |
| Neutral 100 `#F3F5F8` | Neutral 950 `#12171F` (dark mode bg) | 16.8  | AAA                |

### 15.2 Rules

- **Body text on brand green:** `--primary` = green 600 by default (AA-safe for off-white text). Green 500 is the brand identity color reserved for `--ring`, chart series, and large-text-only surfaces where WCAG-AA-large (3:1) is acceptable. Never render small body text on green 500 in off-white — use black text or switch to green 600+.
- **Never white on flame yellow.** Always `#111`.
- **Focus rings:** 2 px `--ring`, never removed. On dark backgrounds, use the lighter dark-mode ring.
- **Color-only state:** always pair with icon, dot, or label.
- **Reduced motion:** respected via `MotionConfig reducedMotion="user"` + CSS `@media (prefers-reduced-motion)` fallback.
- **Keyboard:** full tab order, `Escape` closes floating UI, `Cmd+K` opens command palette.
- **Screen reader:** `aria-label` on all icon-only buttons; `aria-hidden` on decorative icons; `role="status"` on toasts; `aria-live="polite"` on async updates.

### 15.3 Testing

- Automated: `@axe-core/react` runs in Vitest component tests.
- Manual: each PR validates keyboard nav + screen reader announcements on changed pages.

---

## 16. Dark mode

### 16.1 Stance

First-class. Light and dark palettes both curated, per-page audited. Not an afterthought, not a token inversion.

### 16.2 Toggle

Three-way: `light` / `dark` / `system`. Implemented via `ThemeToggle` component in the header.

- Persisted in `localStorage` under key `fundavida:theme`.
- `system` reads `prefers-color-scheme` and reacts to OS change.
- No flash on page load: theme class applied to `<html>` before React hydrates, via an inline script in `index.html`:

```html
<script>
  ;(function () {
    var stored = localStorage.getItem('fundavida:theme')
    var theme = stored || 'system'
    var resolved =
      theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme
    document.documentElement.classList.add(resolved)
  })()
</script>
```

### 16.3 Palette derivation

See §3.4. Dark primary uses OKLCH lightness shift of light primary (same hue, different lightness/chroma). Brand identity stays recognizable.

### 16.4 Per-component rules

- **Charts:** heavier line weights, muted fills, lower-opacity grid.
- **Illustrations:** dark-variant SVG exports via in-SVG media query.
- **Shadows:** opacity ~1.5× to remain visible on deep backgrounds.
- **Focus rings:** use dark-mode `--ring` (brand green 400), brighter to read on neutral 900.
- **Overlays:** `bg-black/70` instead of `bg-black/50` in dark to maintain separation.

### 16.5 Per-page audit (delivered in PR 2)

Every admin page opened in both modes during implementation QA. Tokens adjusted where any component reads poorly. No "good enough" — if a page fails the audit, PR 2 doesn't ship.

---

## 17. Patterns to avoid — the AI-template checklist

These are the markers that read as generic AI-slop or template-grade work. Avoid them:

1. ❌ **Generic shadcn blue** (`hsl(221.2 83.2% 53.3%)`) as primary. → Use brand green 500.
2. ❌ **Inverted slate dark mode** (dark = light palette with darker surface). → Use curated dark palette derived from brand.
3. ❌ **Purple / pink chart colors** (`#B762E0`, `#E93D7C`). → Monochromatic brand ramps only.
4. ❌ **Flat status badges** (single bright color fill, no soft tint). → Soft-tinted background + saturated foreground + optional dot.
5. ❌ **Spinner loaders.** → Skeleton matching final component shape.
6. ❌ **Bare empty states** ("No results"). → Illustration + heading + body + CTA.
7. ❌ **Absent focus rings** or `outline: none` without replacement. → 2 px brand-green ring, never removed.
8. ❌ **Dropdown menus overlapping active table rows.** → `collisionBoundary="viewport"` + `align="end"` defaults.
9. ❌ **Default font stacks** (browser fallback only). → Geist Sans self-hosted.
10. ❌ **Stock enterprise photography** (suits + handshakes). → Custom illustration or curated community photos only.
11. ❌ **Emoji as UI icons.** → Lucide + flame-motif set. (👋 in the WelcomeBanner is a deliberate exception.)
12. ❌ **"Oops!" or "Something went wrong"** error copy. → Specific, actionable, warm.
13. ❌ **Route transitions that bounce or spring.** → Linear `fadeUp` with cubic ease-out.
14. ❌ **Orchestrated animations across routes** (shared-layout on admin pages). → Route-level `fadeUp` only.
15. ❌ **Stat cards with bare numbers.** → Always include sparkline or delta.
16. ❌ **Avatar placeholders with initials in a ring** (the shadcn default). → Use Blush/Humaaans-style person illustrations.
17. ❌ **Purple gradients** ("from-purple-500 to-pink-500"). → Brand tonal gradients (green, blue, flame) only.
18. ❌ **AI-generated illustration packs.** → Recolored unDraw or custom Figma SVG only.

If a PR introduces any of these, push back in review.

---

## 18. Asset reference

| Asset                     | Path                           | Notes                                       |
| ------------------------- | ------------------------------ | ------------------------------------------- |
| Master logo (SVG)         | `public/logo.svg`              | Full lockup, pictorial + wordmark           |
| Favicon (ICO)             | `public/favicon.ico`           | Browser tab icon                            |
| Design tokens (CSS)       | `src/index.css`                | CSS custom properties, `:root` + `.dark`    |
| Tailwind tokens (TS)      | `tailwind.config.ts`           | Semantic color mapping, shadows, animations |
| Motion presets (TS)       | `src/lib/motion.ts`            | Framer Motion `Variants` + `Transition`     |
| Flame icon set            | `src/components/icons/flame/`  | 6 custom React components                   |
| Brand components          | `src/components/brand/`        | `LogoMark`, `FlameSeparator`                |
| Shared components         | `src/components/shared/`       | `StatCard`, `EmptyState`, etc.              |
| Landing components        | `src/components/landing/`      | Hero, TrustStrip, FeatureBento, etc.        |
| Empty-state illustrations | `src/components/empty-states/` | SVG, light + dark variants                  |
| Font faces                | `node_modules/@fontsource/*`   | Geist Sans, Geist Mono, Instrument Serif    |

---

## 19. About FundaVida

[FundaVida](https://www.fundavida.org/) operates programs including Interactive Computer Centers, English, Youth with Purpose, Counseling, and Educational Support. To learn more or contribute through donations, volunteering, or partnerships, visit [fundavida.org](https://www.fundavida.org/).

> _"La esperanza lo cambia todo."_
