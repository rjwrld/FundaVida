# Phase 8 — UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace FundaVida's generic shadcn baseline with a brand-led UI system (warm SaaS-dashboard aesthetic, dark mode, motion, illustrations) across 8 vertical-slice PRs.

**Architecture:** Token swap first (PR 1) so later PRs cascade automatically. Shared components built before they're integrated (PR 3 before PRs 4–7). Landing last (PR 8) so screenshots capture the polished admin.

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Tailwind CSS · shadcn/ui · Radix primitives · **Framer Motion · Sonner · Recharts · cmdk · @fontsource/{geist-sans,geist-mono,instrument-serif}** · Vitest · Playwright · Lucide icons.

**Spec:** [`docs/superpowers/specs/2026-04-23-phase-8-ui-overhaul-design.md`](../specs/2026-04-23-phase-8-ui-overhaul-design.md)
**Brand ref:** [`docs/brand/brand-guidelines.md`](../../brand/brand-guidelines.md)

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off fresh `main`.
- **Never** `Co-Authored-By: Claude` trailers. **Never** "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces; sentence-case blocked).

---

## File Structure Map

### PR 1 — Design tokens + logo asset wiring

| Path                 | Change  | Purpose                                                                                                                      |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `package.json`       | Modify  | Add deps: framer-motion, sonner, recharts, cmdk, @fontsource/{geist-sans,geist-mono,instrument-serif}. Upgrade lucide-react. |
| `src/index.css`      | Replace | OKLCH brand ramps, semantic tokens (light + dark), font-feature-settings                                                     |
| `tailwind.config.ts` | Modify  | Add chart tokens, shadow-glow-\*, safelist brand ramp classes                                                                |
| `src/main.tsx`       | Modify  | Import @fontsource CSS; wrap in MotionConfig + ThemeProvider                                                                 |
| `src/lib/motion.ts`  | Create  | Framer Motion Variants + Transition presets                                                                                  |
| `index.html`         | Modify  | Inline no-FOUT theme script + update title                                                                                   |

### PR 2 — Theme toggle + dark mode audit

| Path                                                   | Change | Purpose                                       |
| ------------------------------------------------------ | ------ | --------------------------------------------- |
| `src/hooks/useTheme.ts`                                | Create | Theme state + localStorage + media query hook |
| `src/components/shared/ThemeToggle.tsx`                | Create | Three-way light/dark/system toggle            |
| `src/components/shared/__tests__/ThemeToggle.test.tsx` | Create | Vitest smoke                                  |
| `src/components/layout/Header.tsx`                     | Modify | Mount ThemeToggle                             |
| `src/locales/en.json`, `es.json`                       | Modify | Add `common.theme.*` keys                     |

### PR 3 — Shared components + flame icons

| Path                                                                                        | Purpose                                 |
| ------------------------------------------------------------------------------------------- | --------------------------------------- |
| `src/components/shared/StatCard.tsx` + test                                                 | Stat card w/ sparkline, delta, variants |
| `src/components/shared/AvatarStack.tsx` + test                                              | Overlapping avatars + overflow          |
| `src/components/shared/EmptyState.tsx` + test                                               | Illustration + heading + body + CTA     |
| `src/components/shared/PageHeader.tsx` + test                                               | Title + description + action slot       |
| `src/components/shared/WelcomeBanner.tsx` + test                                            | Dashboard greeting                      |
| `src/components/shared/CalendarWidget.tsx` + test                                           | Monthly calendar w/ event dots          |
| `src/components/shared/UpcomingList.tsx` + test                                             | Reminders/events list                   |
| `src/components/shared/AnimatedNumber.tsx` + test                                           | Counter tween                           |
| `src/components/shared/skeletons/{SkeletonTable,SkeletonCard,SkeletonStatCard}.tsx` + tests | Loading states                          |
| `src/components/icons/flame/*.tsx` (6 files) + `index.ts`                                   | Brand flame icon set                    |
| `src/components/brand/LogoMark.tsx` + test                                                  | Logo variants                           |
| `src/components/brand/FlameSeparator.tsx`                                                   | Decorative divider                      |

### PR 4 — Navigation + command palette + dropdown fix

| Path                                              | Change | Purpose                                        |
| ------------------------------------------------- | ------ | ---------------------------------------------- |
| `src/components/ui/dropdown-menu.tsx`             | Modify | Global collision defaults                      |
| `src/components/ui/popover.tsx`                   | Modify | Global collision defaults                      |
| `src/components/ui/command.tsx`                   | Create | shadcn Command primitive                       |
| `src/components/shared/CommandPalette.tsx` + test | Create | Cmd+K palette                                  |
| `src/components/layout/Sidebar.tsx`               | Modify | Sections, active accent, collapse              |
| `src/components/layout/Header.tsx`                | Modify | Breadcrumbs + menu                             |
| `src/components/layout/NeedHelpCard.tsx`          | Create | Sidebar promo                                  |
| `src/App.tsx`                                     | Modify | AnimatePresence wrapping routes, Cmd+K handler |
| `src/hooks/useCommandPalette.ts`                  | Create | Global shortcut + state                        |
| All admin `src/pages/*.tsx`                       | Modify | Integrate PageHeader                           |

### PR 5 — Dashboard homepage redesign

| Path                                              | Change  | Purpose                                          |
| ------------------------------------------------- | ------- | ------------------------------------------------ |
| `src/pages/DashboardPage.tsx`                     | Rewrite | WelcomeBanner + stat cards + bento + right panel |
| `src/components/dashboard/StatRow.tsx`            | Create  | 4-card stat row                                  |
| `src/components/dashboard/RecentActivity.tsx`     | Create  | Audit tail                                       |
| `src/components/dashboard/TopCourses.tsx`         | Create  | Top 3 courses                                    |
| `src/components/dashboard/PendingApprovals.tsx`   | Create  | Pending callout                                  |
| `src/components/dashboard/AttendanceSnapshot.tsx` | Create  | Mini attendance summary                          |
| `src/pages/__tests__/DashboardPage.test.tsx`      | Modify  | New assertions                                   |
| `src/locales/en.json`, `es.json`                  | Modify  | Dashboard copy                                   |

### PR 6 — List pages unified pattern

| Path                                                                                   | Change | Purpose                 |
| -------------------------------------------------------------------------------------- | ------ | ----------------------- |
| 8× `src/pages/*ListPage.tsx`                                                           | Modify | Apply unified pattern   |
| `src/components/empty-states/StudentsEmpty.tsx`                                        | Create | Illustrated empty state |
| `src/components/empty-states/CoursesEmpty.tsx`                                         | Create | "                       |
| `src/components/empty-states/CertificatesEmpty.tsx`                                    | Create | "                       |
| `src/components/empty-states/TeachersEmpty.tsx`                                        | Create | "                       |
| `src/components/empty-states/ReportsEmpty.tsx`                                         | Create | "                       |
| `src/components/empty-states/AuditLogsEmpty.tsx`                                       | Create | "                       |
| `public/illustrations/{students,courses,certificates,teachers,reports,audit-logs}.svg` | Create | 6 recolored unDraw SVGs |

### PR 7 — Reports bento + Certificates grid

| Path                                                       | Change  | Purpose                 |
| ---------------------------------------------------------- | ------- | ----------------------- |
| `src/pages/ReportsPage.tsx`                                | Rewrite | 4×3 bento with charts   |
| `src/components/reports/EnrollmentTrendChart.tsx`          | Create  | Recharts line           |
| `src/components/reports/AttendanceHeatmap.tsx`             | Create  | 7×12 grid               |
| `src/components/reports/AverageGradeDonut.tsx`             | Create  | Recharts donut          |
| `src/components/reports/TcuProgressRing.tsx`               | Create  | SVG progress ring       |
| `src/components/reports/TopCoursesBar.tsx`                 | Create  | Recharts horizontal bar |
| `src/pages/CertificatesListPage.tsx`                       | Rewrite | Grid-of-cards view      |
| `src/components/certificates/CertificateCard.tsx`          | Create  | Grid cell               |
| `src/components/certificates/CertificatePreviewDialog.tsx` | Modify  | Framer Motion entrance  |

### PR 8 — Landing page full redesign

| Path                                              | Change  | Purpose                              |
| ------------------------------------------------- | ------- | ------------------------------------ |
| `src/pages/LandingPage.tsx`                       | Rewrite | Mount 6 new sections                 |
| `src/components/landing/Hero.tsx`                 | Rewrite | Aurora bg + isometric illustration   |
| `src/components/landing/TrustStrip.tsx`           | Create  | Narrow stat band                     |
| `src/components/landing/FeatureBento.tsx`         | Create  | Replaces FeaturePreview              |
| `src/components/landing/RearchitectureDelta.tsx`  | Create  | Before/after rows                    |
| `src/components/landing/TechStackMarquee.tsx`     | Create  | Replaces TechStack                   |
| `src/components/landing/FinalCTA.tsx`             | Create  | End-of-page CTA                      |
| `src/components/landing/AuroraBackground.tsx`     | Create  | Aceternity adapt                     |
| `src/components/landing/BentoGrid.tsx`            | Create  | shadcn-compatible grid               |
| `src/components/landing/NumberTicker.tsx`         | Create  | Animated counter                     |
| `src/components/landing/Marquee.tsx`              | Create  | Magic UI adapt                       |
| `public/illustrations/landing-hero.svg`           | Create  | 3D isometric hero (2 variants)       |
| `public/screenshots/*.png`, `public/og-image.png` | Replace | Regenerate via `npm run screenshots` |
| `src/locales/en.json`, `es.json`                  | Modify  | Landing copy                         |

---

## Task 1: Design tokens + logo asset wiring

**Branch:** `feat/phase-8-brand-foundation`

**Goal:** Swap generic shadcn palette for brand OKLCH ramps + self-hosted fonts + motion library. No visual redesign yet — components cascade new tokens. This is the foundation for every subsequent PR.

### Step 1: Branch off fresh main

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-brand-foundation
```

### Step 2: Add dependencies

- [ ] **2.1** Install runtime + dev deps:

```bash
npm install framer-motion@^12 sonner recharts@^2 cmdk
npm install @fontsource/geist-sans @fontsource/geist-mono @fontsource/instrument-serif
```

- [ ] **2.2** Upgrade lucide-react (current `^1.8.0` is incorrect — package versions at 0.x):

```bash
npm install lucide-react@latest
```

Verify in `package.json` that `lucide-react` is now `^0.4xx.0` or similar. If npm install fails for lucide-react because no matching version, install explicitly: `npm install lucide-react@^0.468.0`.

### Step 3: Replace `src/index.css`

- [ ] **3.1** Replace the entire contents of `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Brand Green ramp (primary product color) */
    --brand-green-50: oklch(0.97 0.02 138);
    --brand-green-100: oklch(0.93 0.05 138);
    --brand-green-200: oklch(0.87 0.09 138);
    --brand-green-300: oklch(0.78 0.14 138);
    --brand-green-400: oklch(0.68 0.16 138);
    --brand-green-500: oklch(0.57 0.17 138);
    --brand-green-600: oklch(0.5 0.16 138);
    --brand-green-700: oklch(0.42 0.14 138);
    --brand-green-800: oklch(0.34 0.11 138);
    --brand-green-900: oklch(0.26 0.08 138);
    --brand-green-950: oklch(0.18 0.05 138);

    /* Brand Blue ramp (secondary / institutional) */
    --brand-blue-50: oklch(0.97 0.02 260);
    --brand-blue-100: oklch(0.92 0.05 260);
    --brand-blue-200: oklch(0.84 0.1 260);
    --brand-blue-300: oklch(0.74 0.15 260);
    --brand-blue-400: oklch(0.62 0.18 260);
    --brand-blue-500: oklch(0.51 0.19 260);
    --brand-blue-600: oklch(0.44 0.18 260);
    --brand-blue-700: oklch(0.37 0.16 260);
    --brand-blue-800: oklch(0.3 0.13 260);
    --brand-blue-900: oklch(0.24 0.1 260);
    --brand-blue-950: oklch(0.17 0.06 260);

    /* Flame Red ramp (destructive) */
    --flame-red-50: oklch(0.97 0.02 27);
    --flame-red-100: oklch(0.92 0.06 27);
    --flame-red-200: oklch(0.84 0.13 27);
    --flame-red-300: oklch(0.72 0.21 27);
    --flame-red-400: oklch(0.62 0.24 27);
    --flame-red-500: oklch(0.52 0.25 27);
    --flame-red-600: oklch(0.46 0.22 27);
    --flame-red-700: oklch(0.39 0.18 27);
    --flame-red-800: oklch(0.32 0.14 27);
    --flame-red-900: oklch(0.25 0.1 27);
    --flame-red-950: oklch(0.17 0.06 27);

    /* Flame Yellow ramp (accent / celebration / warning) */
    --flame-yellow-50: oklch(0.98 0.02 90);
    --flame-yellow-100: oklch(0.95 0.06 90);
    --flame-yellow-200: oklch(0.92 0.11 90);
    --flame-yellow-300: oklch(0.9 0.15 90);
    --flame-yellow-400: oklch(0.87 0.16 90);
    --flame-yellow-500: oklch(0.85 0.17 90);
    --flame-yellow-600: oklch(0.75 0.16 90);
    --flame-yellow-700: oklch(0.63 0.14 90);
    --flame-yellow-800: oklch(0.5 0.11 90);
    --flame-yellow-900: oklch(0.38 0.09 90);
    --flame-yellow-950: oklch(0.25 0.06 90);

    /* Neutral ramp (cool gray, hue 220) */
    --neutral-50: oklch(0.99 0.003 220);
    --neutral-100: oklch(0.96 0.006 220);
    --neutral-200: oklch(0.92 0.01 220);
    --neutral-300: oklch(0.86 0.015 220);
    --neutral-400: oklch(0.7 0.02 220);
    --neutral-500: oklch(0.55 0.025 220);
    --neutral-600: oklch(0.45 0.025 220);
    --neutral-700: oklch(0.35 0.022 220);
    --neutral-800: oklch(0.26 0.018 220);
    --neutral-900: oklch(0.18 0.015 220);
    --neutral-950: oklch(0.13 0.012 220);

    /* Semantic tokens — light mode */
    --background: var(--neutral-50);
    --foreground: oklch(0.18 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.18 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.18 0 0);
    --primary: var(--brand-green-600);
    --primary-foreground: oklch(0.99 0.003 95);
    --secondary: var(--brand-blue-500);
    --secondary-foreground: oklch(0.99 0.003 95);
    --muted: var(--neutral-100);
    --muted-foreground: var(--neutral-500);
    --accent: var(--brand-green-50);
    --accent-foreground: var(--brand-green-700);
    --destructive: var(--flame-red-500);
    --destructive-foreground: oklch(0.99 0.003 95);
    --success: var(--brand-green-500);
    --warning: var(--flame-yellow-500);
    --info: var(--brand-blue-500);
    --border: var(--neutral-200);
    --input: var(--neutral-200);
    --ring: var(--brand-green-500);

    /* Chart categorical palette */
    --chart-1: var(--brand-green-500);
    --chart-2: var(--brand-blue-500);
    --chart-3: var(--flame-yellow-500);
    --chart-4: var(--brand-green-700);
    --chart-5: var(--brand-blue-700);

    --radius: 0.75rem;
  }

  .dark {
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

    --chart-1: var(--brand-green-400);
    --chart-2: var(--brand-blue-400);
    --chart-3: var(--flame-yellow-400);
    --chart-4: var(--brand-green-300);
    --chart-5: var(--brand-blue-300);
  }

  * {
    @apply border-border;
  }

  html {
    background-color: oklch(var(--background));
  }

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

  .font-mono {
    font-family: 'Geist Mono', ui-monospace, SFMono-Regular, monospace;
  }

  @media (prefers-reduced-motion: reduce) {
    .aurora,
    .marquee,
    .float,
    .pulse-soft {
      animation: none !important;
    }
  }
}
```

### Step 4: Update `tailwind.config.ts`

- [ ] **4.1** Replace `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary))',
          foreground: 'oklch(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary))',
          foreground: 'oklch(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive))',
          foreground: 'oklch(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent))',
          foreground: 'oklch(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover))',
          foreground: 'oklch(var(--popover-foreground))',
        },
        success: 'oklch(var(--success))',
        warning: 'oklch(var(--warning))',
        info: 'oklch(var(--info))',
        'brand-green': {
          50: 'oklch(var(--brand-green-50))',
          100: 'oklch(var(--brand-green-100))',
          200: 'oklch(var(--brand-green-200))',
          300: 'oklch(var(--brand-green-300))',
          400: 'oklch(var(--brand-green-400))',
          500: 'oklch(var(--brand-green-500))',
          600: 'oklch(var(--brand-green-600))',
          700: 'oklch(var(--brand-green-700))',
          800: 'oklch(var(--brand-green-800))',
          900: 'oklch(var(--brand-green-900))',
          950: 'oklch(var(--brand-green-950))',
        },
        'brand-blue': {
          50: 'oklch(var(--brand-blue-50))',
          100: 'oklch(var(--brand-blue-100))',
          200: 'oklch(var(--brand-blue-200))',
          300: 'oklch(var(--brand-blue-300))',
          400: 'oklch(var(--brand-blue-400))',
          500: 'oklch(var(--brand-blue-500))',
          600: 'oklch(var(--brand-blue-600))',
          700: 'oklch(var(--brand-blue-700))',
          800: 'oklch(var(--brand-blue-800))',
          900: 'oklch(var(--brand-blue-900))',
          950: 'oklch(var(--brand-blue-950))',
        },
        'flame-red': {
          50: 'oklch(var(--flame-red-50))',
          500: 'oklch(var(--flame-red-500))',
          600: 'oklch(var(--flame-red-600))',
          700: 'oklch(var(--flame-red-700))',
        },
        'flame-yellow': {
          50: 'oklch(var(--flame-yellow-50))',
          400: 'oklch(var(--flame-yellow-400))',
          500: 'oklch(var(--flame-yellow-500))',
          600: 'oklch(var(--flame-yellow-600))',
        },
        chart: {
          1: 'oklch(var(--chart-1))',
          2: 'oklch(var(--chart-2))',
          3: 'oklch(var(--chart-3))',
          4: 'oklch(var(--chart-4))',
          5: 'oklch(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 12px)',
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        card: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        elevated: '0 10px 40px -10px rgba(0,0,0,0.10), 0 2px 10px -2px rgba(0,0,0,0.04)',
        'glow-primary': '0 8px 24px -8px oklch(0.57 0.17 138 / 0.35)',
        'glow-flame': '0 8px 24px -8px oklch(0.85 0.17 90 / 0.40)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(-10%, -10%) rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s infinite',
        'aurora-drift': 'aurora-drift 20s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
```

### Step 5: Create motion presets

- [ ] **5.1** Create `src/lib/motion.ts`:

```ts
import type { Transition, Variants } from 'framer-motion'

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
  ease: [0.22, 1, 0.36, 1],
}

export const transitionFast: Transition = {
  duration: 0.2,
  ease: 'easeOut',
}
```

### Step 6: Wire fonts in `src/main.tsx`

- [ ] **6.1** Read current `src/main.tsx` first with `cat src/main.tsx`. Prepend these imports before the existing imports:

```ts
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import { MotionConfig } from 'framer-motion'
```

- [ ] **6.2** Wrap the root render in `<MotionConfig reducedMotion="user">`. If current file is:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

Change to:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
)
```

### Step 7: No-FOUT theme script in `index.html`

- [ ] **7.1** Open `index.html`. Inside `<head>`, immediately before the closing `</head>`, add:

```html
<script>
  ;(function () {
    try {
      var stored = localStorage.getItem('fundavida:v1:theme')
      var theme = stored || 'system'
      var resolved =
        theme === 'system'
          ? matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme
      if (resolved === 'dark') document.documentElement.classList.add('dark')
    } catch (e) {}
  })()
</script>
```

### Step 8: Run the gauntlet

- [ ] **8.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

All must pass. Format:check may want to rewrite tailwind.config.ts or index.css; if so, run `npm run format` first, re-stage, re-run.

- [ ] **8.2** Visual sanity check — run `npm run dev` and open `http://localhost:5173/`. App should render:
  - Slightly different colors (brand green instead of shadcn blue on primary buttons)
  - New font (Geist Sans) on all text
  - No visual regressions (all layouts unchanged)

If anything looks broken (tokens mis-referenced, fonts not loading), fix before commit.

### Step 9: Commit

- [ ] **9.1:**

```bash
git add package.json package-lock.json src/index.css tailwind.config.ts src/main.tsx src/lib/motion.ts index.html
git commit -m "feat: apply brand tokens, self-hosted fonts, and motion foundation"
```

### Step 10: Push + PR

- [ ] **10.1:**

```bash
git push -u origin feat/phase-8-brand-foundation
gh pr create --title "feat: apply brand tokens, self-hosted fonts, and motion foundation" --body "$(cat <<'EOF'
## Summary
- Swap generic shadcn palette for FundaVida brand OKLCH ramps (brand green, brand blue, flame red, flame yellow, cool neutrals) in src/index.css.
- Semantic tokens: --primary = brand green 600 (WCAG-AA safe); --ring = brand green 500 (brand identity accent).
- Full dark palette curated (not token-inverted), derived from OKLCH lightness shifts.
- Self-host Geist Sans, Geist Mono, Instrument Serif via @fontsource.
- Add framer-motion, sonner, recharts, cmdk deps; upgrade lucide-react.
- No visual redesign in this PR — components cascade new tokens automatically.

## Test plan
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run format:check
- [x] npm run test (all pass)
- [x] npm run i18n:check
- [x] npm run build
- [x] npm run dev — verified brand colors applied, fonts loaded
EOF
)"
```

- [ ] **10.2** Stop at PR. Watch CI.

---

## Task 2: Theme toggle + dark mode audit

**Branch:** `feat/phase-8-theme-toggle`

**Goal:** Ship the light/dark/system toggle the user specifically asked for. Audit every existing page in both modes, adjust tokens where they read poorly.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-theme-toggle
```

### Step 2: TDD — write failing test for useTheme hook

- [ ] **2.1** Create `src/hooks/__tests__/useTheme.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to system theme when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
  })

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('fundavida:v1:theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('setTheme persists to localStorage and applies class', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(localStorage.getItem('fundavida:v1:theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme light removes dark class', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('system theme follows prefers-color-scheme', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
      matches: q === '(prefers-color-scheme: dark)',
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }))
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('system'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
```

- [ ] **2.2** Run: `npm run test -- useTheme`. Expect: FAIL with "cannot find module".

### Step 3: Implement `useTheme`

- [ ] **3.1** Create `src/hooks/useTheme.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'fundavida:v1:theme'

function resolveSystem(): 'light' | 'dark' {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? resolveSystem() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    return stored ?? 'system'
  })

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return { theme, setTheme }
}
```

- [ ] **3.2** Run: `npm run test -- useTheme`. Expect: PASS.

### Step 4: Build `ThemeToggle` component

- [ ] **4.1** Create `src/components/shared/ThemeToggle.tsx`:

```tsx
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '@/hooks/useTheme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const icons: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const ActiveIcon = icons[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('common.theme.toggle')}>
          <ActiveIcon size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun size={16} className="mr-2" />
          {t('common.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon size={16} className="mr-2" />
          {t('common.theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor size={16} className="mr-2" />
          {t('common.theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 5: Add locale keys

- [ ] **5.1** Open `src/locales/en.json`. Under `common`, add:

```json
"theme": {
  "toggle": "Toggle theme",
  "light": "Light",
  "dark": "Dark",
  "system": "System"
}
```

- [ ] **5.2** Open `src/locales/es.json`. Under `common`, add:

```json
"theme": {
  "toggle": "Cambiar tema",
  "light": "Claro",
  "dark": "Oscuro",
  "system": "Sistema"
}
```

### Step 6: Component test for ThemeToggle

- [ ] **6.1** Create `src/components/shared/__tests__/ThemeToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { ThemeToggle } from '../ThemeToggle'

function renderWithI18n() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeToggle />
    </I18nextProvider>
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders an accessible toggle button', () => {
    renderWithI18n()
    expect(screen.getByRole('button', { name: /toggle theme|cambiar tema/i })).toBeInTheDocument()
  })

  it('opens the menu and applies dark theme', async () => {
    const user = userEvent.setup()
    renderWithI18n()
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText(/^(dark|oscuro)$/i))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('fundavida:v1:theme')).toBe('dark')
  })
})
```

- [ ] **6.2** Run: `npm run test -- ThemeToggle`. Expect: PASS.

### Step 7: Mount ThemeToggle in Header

- [ ] **7.1** Open `src/components/layout/Header.tsx`. Add import:

```tsx
import { ThemeToggle } from '@/components/shared/ThemeToggle'
```

- [ ] **7.2** Place `<ThemeToggle />` in the header's right-side control cluster (next to the existing language switcher / user menu).

### Step 8: Dark mode per-page audit

- [ ] **8.1** Start dev server: `npm run dev`. Kill any existing on port 5173 first: `lsof -ti:5173 | xargs kill -9 2>/dev/null || true`.

- [ ] **8.2** For each route below, open it in both light and dark, screenshot mentally, verify:
  - Text is readable against background (no near-invisible low-contrast pairs)
  - Borders visible in both modes
  - Focus rings visible on tab through
  - Buttons have clear hover + pressed states
  - Status pills readable
  - Dropdowns readable

Routes to audit:

- `/` (landing)
- `/app` (dashboard)
- `/app/students`, `/app/students/new`, `/app/students/:id`
- `/app/courses`, `/app/courses/new`, `/app/courses/:id`
- `/app/teachers`, `/app/teachers/new`, `/app/teachers/:id`
- `/app/enrollments`
- `/app/grades`
- `/app/attendance`
- `/app/certificates`
- `/app/reports`
- `/app/audit`
- `/app/bulk-email`
- `/app/tcu`
- `/404` (NotFound)

- [ ] **8.3** Fix any tokens that fail the audit. Common adjustments:
  - If table header tint is invisible in dark: change from `bg-muted/50` to `bg-muted`
  - If border is too faint in dark: change from `--border` to `--border` with explicit darker value
  - If card surface is indistinguishable from background in dark: increase lift via shadow-card opacity 1.5x in dark (tweak in tailwind.config.ts)

Commit each group of fixes as you go (don't batch 20 fixes in one commit).

### Step 9: Run the gauntlet

- [ ] **9.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

### Step 10: Commit

- [ ] **10.1:**

```bash
git add src/hooks/useTheme.ts src/hooks/__tests__/useTheme.test.ts \
  src/components/shared/ThemeToggle.tsx src/components/shared/__tests__/ThemeToggle.test.tsx \
  src/components/layout/Header.tsx src/locales/en.json src/locales/es.json
git commit -m "feat: add light/dark/system theme toggle with per-page audit"
```

If audit required additional token edits to `src/index.css` or `tailwind.config.ts`, include those too (prefer multiple commits if the audit surfaced many issues).

### Step 11: Push + PR

- [ ] **11.1:**

```bash
git push -u origin feat/phase-8-theme-toggle
gh pr create --title "feat: add light/dark/system theme toggle with per-page audit" --body "$(cat <<'EOF'
## Summary
- New useTheme hook reads/writes fundavida:v1:theme from localStorage and applies .dark class on <html>.
- ThemeToggle component in the header offers three-way light/dark/system with Lucide icons.
- Respects prefers-color-scheme when theme is system; reacts to OS change.
- Per-page audit across all admin routes + landing; tokens tweaked where contrast or surface separation was poor.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build
- [x] Manual audit every route in both modes
EOF
)"
```

- [ ] **11.2** Stop at PR.

---

## Task 3: Shared components + flame icons

**Branch:** `feat/phase-8-shared-components`

**Goal:** Build the reusable primitives that PRs 4–7 consume. No page-level integration in this PR.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-shared-components
```

### Step 2: `AnimatedNumber`

- [ ] **2.1** Create `src/components/shared/AnimatedNumber.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Props {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}

export function AnimatedNumber({
  value,
  duration = 1000,
  format = (n) => n.toLocaleString(),
  className,
}: Props) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, reduced])

  return <span className={className}>{format(display)}</span>
}
```

- [ ] **2.2** Create `src/components/shared/__tests__/AnimatedNumber.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimatedNumber } from '../AnimatedNumber'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

describe('AnimatedNumber', () => {
  it('renders final value immediately when reduced motion is on', () => {
    render(<AnimatedNumber value={124} />)
    expect(screen.getByText('124')).toBeInTheDocument()
  })

  it('applies custom format function', () => {
    render(<AnimatedNumber value={1500} format={(n) => `$${n}`} />)
    expect(screen.getByText('$1,500'.replace(',', ''))).toBeInTheDocument()
  })
})
```

- [ ] **2.3** Run: `npm run test -- AnimatedNumber`. Expect: PASS.

### Step 3: `StatCard`

- [ ] **3.1** Create `src/components/shared/StatCard.tsx`:

```tsx
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatedNumber } from './AnimatedNumber'

type Variant = 'default' | 'primary' | 'flame' | 'blue'

interface Props {
  label: string
  value: number
  delta?: number
  deltaLabel?: string
  sparkline?: number[]
  variant?: Variant
  format?: (n: number) => string
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-card',
  primary: 'bg-gradient-to-br from-brand-green-50 to-card',
  flame: 'bg-gradient-to-br from-flame-yellow-50 to-card',
  blue: 'bg-gradient-to-br from-brand-blue-50 to-card',
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  sparkline,
  variant = 'default',
  format,
  className,
}: Props) {
  const isPositive = (delta ?? 0) >= 0
  return (
    <Card className={cn(variantClasses[variant], 'shadow-card', className)}>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <AnimatedNumber
            value={value}
            format={format}
            className="font-mono text-3xl font-semibold text-foreground"
          />
          {sparkline && <Sparkline values={sparkline} positive={isPositive} />}
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              'mt-3 flex items-center gap-1 text-sm',
              isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            <span className="font-medium">
              {Math.abs(delta)}% {deltaLabel ?? ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 80
      const y = 24 - ((v - min) / range) * 20
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" aria-hidden>
      <polyline
        fill="none"
        strokeWidth="2"
        stroke={positive ? 'oklch(var(--success))' : 'oklch(var(--destructive))'}
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

- [ ] **3.2** Create `src/components/shared/__tests__/StatCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatCard } from '../StatCard'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Students" value={124} />)
    expect(screen.getByText('Students')).toBeInTheDocument()
    expect(screen.getByText('124')).toBeInTheDocument()
  })

  it('renders positive delta with up arrow', () => {
    render(<StatCard label="Students" value={124} delta={10} deltaLabel="vs last month" />)
    expect(screen.getByText(/10%/)).toBeInTheDocument()
    expect(screen.getByText(/vs last month/)).toBeInTheDocument()
  })

  it('renders sparkline when values provided', () => {
    const { container } = render(
      <StatCard label="Students" value={124} sparkline={[1, 2, 3, 4, 5]} />
    )
    expect(container.querySelector('svg polyline')).toBeInTheDocument()
  })
})
```

- [ ] **3.3** Run: `npm run test -- StatCard`. Expect: PASS.

### Step 4: `AvatarStack`

- [ ] **4.1** Create `src/components/shared/AvatarStack.tsx`:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface AvatarItem {
  src?: string
  fallback: string
  alt?: string
}

interface Props {
  avatars: AvatarItem[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }

export function AvatarStack({ avatars, max = 4, size = 'md', className }: Props) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - visible.length
  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((a, i) => (
        <Avatar key={i} className={cn(sizeClasses[size], 'border-2 border-background ring-0')}>
          {a.src && <AvatarImage src={a.src} alt={a.alt ?? ''} />}
          <AvatarFallback>{a.fallback}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            'flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground'
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
```

- [ ] **4.2** Create test: assert renders `max` avatars + `+N` overflow badge when `avatars.length > max`.

### Step 5: `EmptyState`

- [ ] **5.1** Create `src/components/shared/EmptyState.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  illustration?: ReactNode
  heading: string
  body?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ illustration, heading, body, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/50 p-12 text-center',
        className
      )}
    >
      {illustration && <div className="max-w-[240px]">{illustration}</div>}
      <div className="space-y-2">
        <h3 className="font-display text-2xl">{heading}</h3>
        {body && <p className="text-sm text-muted-foreground">{body}</p>}
      </div>
      {action}
    </div>
  )
}
```

- [ ] **5.2** Test: assert heading, body, action, and illustration slots render.

### Step 6: `PageHeader`

- [ ] **6.1** Create `src/components/shared/PageHeader.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-6 md:flex-row md:items-center md:justify-between lg:py-8',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
```

- [ ] **6.2** Test: assert title, description, action all render in correct slots.

### Step 7: `WelcomeBanner`

- [ ] **7.1** Create `src/components/shared/WelcomeBanner.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  greeting: string
  context?: string
  action?: ReactNode
  illustration?: ReactNode
  className?: string
}

export function WelcomeBanner({ greeting, context, action, illustration, className }: Props) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-0 bg-gradient-to-br from-brand-green-50 via-card to-card p-8 shadow-card',
        className
      )}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">{greeting}</h2>
          {context && <p className="max-w-lg text-sm text-muted-foreground">{context}</p>}
          {action && <div className="pt-2">{action}</div>}
        </div>
        {illustration && <div className="hidden shrink-0 md:block">{illustration}</div>}
      </div>
    </Card>
  )
}
```

- [ ] **7.2** Test: assert greeting, context, action, illustration all render.

### Step 8: `CalendarWidget`

- [ ] **8.1** Create `src/components/shared/CalendarWidget.tsx`. Use `date-fns` (install if missing: `npm install date-fns`) to compute the month grid. Cells are 32px square, numbers centered, with a 6px brand-green dot under days that have events. Current day has a filled brand-green circle background. Previous/next month arrows in the header. Reuse `Card` as the outer shell.

Expose these props:

```ts
interface CalendarWidgetProps {
  selected?: Date
  events?: Date[]
  onSelect?: (d: Date) => void
  className?: string
}
```

Implementation is straightforward month-grid rendering with `eachDayOfInterval`, `startOfMonth`, `endOfMonth`, `getDay` from date-fns. Keep under 150 lines total.

- [ ] **8.2** Test: assert month renders 28–31 day cells; event dot appears on dates passed via `events`.

### Step 9: `UpcomingList`

- [ ] **9.1** Create `src/components/shared/UpcomingList.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'info' | 'warning' | 'success' | 'neutral'

interface Item {
  id: string
  title: string
  subtitle?: string
  variant?: Variant
  icon?: ReactNode
}

interface Props {
  items: Item[]
  className?: string
}

const variantClasses: Record<Variant, string> = {
  info: 'text-brand-blue-500 bg-brand-blue-50',
  warning: 'text-flame-yellow-600 bg-flame-yellow-50',
  success: 'text-brand-green-500 bg-brand-green-50',
  neutral: 'text-muted-foreground bg-muted',
}

export function UpcomingList({ items, className }: Props) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              variantClasses[item.variant ?? 'neutral']
            )}
          >
            {item.icon ?? <Bell size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
            {item.subtitle && (
              <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **9.2** Test: assert each item renders title + subtitle + variant-colored icon container.

### Step 10: Skeleton components

- [ ] **10.1** Create `src/components/shared/skeletons/SkeletonTable.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface Props {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonTable({ rows = 8, columns = 5, className }: Props) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 rounded-md bg-card px-4 py-3 shadow-card">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="h-4 flex-1 animate-pulse-soft rounded-sm bg-muted" />
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **10.2** Create `src/components/shared/skeletons/SkeletonCard.tsx`:

```tsx
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse-soft rounded-lg bg-card p-6 shadow-card ${className ?? ''}`}
      role="status"
      aria-label="Loading"
    >
      <div className="h-4 w-1/3 rounded-sm bg-muted" />
      <div className="mt-3 h-8 w-2/3 rounded-sm bg-muted" />
      <div className="mt-2 h-3 w-1/4 rounded-sm bg-muted" />
    </div>
  )
}
```

- [ ] **10.3** Create `src/components/shared/skeletons/SkeletonStatCard.tsx`:

```tsx
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse-soft rounded-lg bg-card p-6 shadow-card ${className ?? ''}`}
      role="status"
      aria-label="Loading"
    >
      <div className="h-3 w-20 rounded-sm bg-muted" />
      <div className="mt-3 flex items-baseline justify-between">
        <div className="h-8 w-24 rounded-sm bg-muted" />
        <div className="h-6 w-20 rounded-sm bg-muted" />
      </div>
      <div className="mt-4 h-3 w-16 rounded-sm bg-muted" />
    </div>
  )
}
```

- [ ] **10.4** One smoke test per skeleton verifying `role="status"` + expected skeleton count.

### Step 11: Flame icon set

- [ ] **11.1** Create `src/components/icons/flame/FlameHope.tsx` using this pattern:

```tsx
import type { SVGProps } from 'react'

export function FlameHope({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2c1.8 3 4 5 4 8a4 4 0 0 1-8 0c0-1.6 1-3 2-4-.5 2 .5 3 2 3 0-2-1-3-1-4 0-1 .5-2 1-3z"
        fill="currentColor"
      />
    </svg>
  )
}
```

- [ ] **11.2** Create the other five icons following the same pattern with flame-silhouette variations. Each icon distinct enough to be visually identifiable:

- `FlameCertificate.tsx` — flame emerging from a document shape.
- `FlameMilestone.tsx` — flame above a stylized peak / star.
- `FlameWelcome.tsx` — flame with two small figure silhouettes at its base (matching logo motif).
- `FlameEmpty.tsx` — flame outline with dashed inner line (signals "empty").
- `FlameCelebration.tsx` — flame with radiating spark lines.

Keep each under 40 lines. Use `currentColor` for fill; downstream sets color via `className="text-brand-green-500"`.

- [ ] **11.3** Create `src/components/icons/flame/index.ts`:

```ts
export { FlameHope } from './FlameHope'
export { FlameCertificate } from './FlameCertificate'
export { FlameMilestone } from './FlameMilestone'
export { FlameWelcome } from './FlameWelcome'
export { FlameEmpty } from './FlameEmpty'
export { FlameCelebration } from './FlameCelebration'
```

### Step 12: `LogoMark`

- [ ] **12.1** Create `src/components/brand/LogoMark.tsx`:

```tsx
import { cn } from '@/lib/utils'

type Variant = 'full' | 'icon' | 'wordmark'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  variant?: Variant
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
}

export function LogoMark({ variant = 'full', size = 'md', className }: Props) {
  const src =
    variant === 'icon' ? '/favicon.svg' : variant === 'wordmark' ? '/logo.svg' : '/logo.svg'
  return (
    <img
      src={src}
      alt="FundaVida"
      className={cn(sizeClasses[size], 'w-auto', className)}
      draggable={false}
    />
  )
}
```

Note: the `wordmark` variant is a placeholder pointing at `logo.svg`; if a dedicated wordmark-only SVG exists later, update this component. Full lockup and wordmark can share the master SVG for now.

- [ ] **12.2** Test: assert `<img src="/favicon.svg">` for `variant="icon"`, `<img src="/logo.svg">` otherwise.

### Step 13: `FlameSeparator`

- [ ] **13.1** Create `src/components/brand/FlameSeparator.tsx`:

```tsx
export function FlameSeparator({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ''}`}>
      <span className="h-px w-12 bg-border" />
      <svg width="16" height="16" viewBox="0 0 24 24" className="text-flame-yellow-500" aria-hidden>
        <path d="M12 2c1.8 3 4 5 4 8a4 4 0 0 1-8 0c0-1.6 1-3 2-4z" fill="currentColor" />
      </svg>
      <span className="h-px w-12 bg-border" />
    </div>
  )
}
```

### Step 14: Run gauntlet

- [ ] **14.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

### Step 15: Commit

- [ ] **15.1:**

```bash
git add src/components/shared src/components/icons/flame src/components/brand src/hooks
git commit -m "feat: add shared components, flame icon set, and logo primitives"
```

### Step 16: Push + PR

- [ ] **16.1:**

```bash
git push -u origin feat/phase-8-shared-components
gh pr create --title "feat: add shared components, flame icon set, and logo primitives" --body "$(cat <<'EOF'
## Summary
- Shared: StatCard (with sparkline + animated number), AvatarStack, EmptyState, PageHeader, WelcomeBanner, CalendarWidget, UpcomingList, AnimatedNumber, 3 Skeleton variants.
- Icons: 6 flame-motif custom SVG icons (flame-hope, -certificate, -milestone, -welcome, -empty, -celebration) with currentColor support.
- Brand: LogoMark component with full/icon/wordmark variants, FlameSeparator decorative divider.
- One Vitest smoke test per component.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build
- [x] Components imported nowhere yet — next PRs consume them
EOF
)"
```

- [ ] **16.2** Stop at PR.

---

## Task 4: Navigation + command palette + dropdown fix

**Branch:** `feat/phase-8-navigation`

**Goal:** Restyle sidebar + header, fix the global dropdown-over-table-row bug at the primitive level, ship `Cmd+K` command palette, wrap routes in AnimatePresence. Integrate `PageHeader` across all admin pages so the next PRs can assume its presence.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-navigation
```

### Step 2: Fix dropdown + popover global collision defaults

- [ ] **2.1** Open `src/components/ui/dropdown-menu.tsx`. Find the `DropdownMenuContent` wrapper. Change its default props so it sets:

```tsx
<DropdownMenuPrimitive.Content
  sideOffset={sideOffset ?? 4}
  collisionPadding={8}
  align={align ?? 'end'}
  {...props}
/>
```

Pass `collisionBoundary={typeof document !== 'undefined' ? document.body : undefined}` if Radix allows; otherwise rely on the viewport default + `collisionPadding`.

- [ ] **2.2** Open `src/components/ui/popover.tsx`. Apply the same default changes: `sideOffset={4}`, `align="end"` unless the caller overrides, `collisionPadding={8}`.

- [ ] **2.3** Run existing tests: `npm run test`. Ensure no existing dropdown-using tests regress. Fix any that assert specific positioning.

### Step 3: Add shadcn `Command` primitive

- [ ] **3.1** Create `src/components/ui/command.tsx` by adapting the canonical shadcn Command component. Paste the shadcn-reference implementation (it wraps `cmdk` and the Radix `Dialog`). Verify the imports: `cmdk` for primitives, `@/components/ui/dialog` for the modal shell.

If shadcn CLI is available: `npx shadcn@latest add command` (otherwise paste from https://ui.shadcn.com/docs/components/command).

### Step 4: `useCommandPalette` hook

- [ ] **4.1** Create `src/hooks/useCommandPalette.ts`:

```ts
import { useEffect, useState } from 'react'

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
```

### Step 5: `CommandPalette` component

- [ ] **5.1** Create `src/components/shared/CommandPalette.tsx`:

```tsx
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Monitor,
  Moon,
  ScrollText,
  Sun,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useTheme } from '@/hooks/useTheme'

export function CommandPalette() {
  const { t } = useTranslation()
  const { open, setOpen } = useCommandPalette()
  const navigate = useNavigate()
  const { setTheme } = useTheme()

  const run = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('common.commandPalette.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('common.commandPalette.empty')}</CommandEmpty>

        <CommandGroup heading={t('common.commandPalette.navigation')}>
          <CommandItem onSelect={() => run(() => navigate('/app'))}>
            <LayoutDashboard size={16} className="mr-2" />
            {t('nav.dashboard')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/app/students'))}>
            <Users size={16} className="mr-2" />
            {t('nav.students')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/app/courses'))}>
            <GraduationCap size={16} className="mr-2" />
            {t('nav.courses')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/app/certificates'))}>
            <ScrollText size={16} className="mr-2" />
            {t('nav.certificates')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/app/reports'))}>
            <CalendarDays size={16} className="mr-2" />
            {t('nav.reports')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/app/bulk-email'))}>
            <Mail size={16} className="mr-2" />
            {t('nav.bulkEmail')}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('common.commandPalette.theme')}>
          <CommandItem onSelect={() => run(() => setTheme('light'))}>
            <Sun size={16} className="mr-2" />
            {t('common.theme.light')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme('dark'))}>
            <Moon size={16} className="mr-2" />
            {t('common.theme.dark')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme('system'))}>
            <Monitor size={16} className="mr-2" />
            {t('common.theme.system')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

- [ ] **5.2** Add locale keys to `en.json` and `es.json`:

```json
"commandPalette": {
  "placeholder": "Type a command or search…",
  "empty": "No results.",
  "navigation": "Navigation",
  "theme": "Theme"
}
```

Spanish:

```json
"commandPalette": {
  "placeholder": "Escribe un comando o busca…",
  "empty": "Sin resultados.",
  "navigation": "Navegación",
  "theme": "Tema"
}
```

- [ ] **5.3** Test: `src/components/shared/__tests__/CommandPalette.test.tsx` — assert palette opens on Cmd+K dispatch, shows groups, dispatches navigate when item clicked.

### Step 6: Mount CommandPalette globally

- [ ] **6.1** Open `src/App.tsx`. Add import:

```tsx
import { CommandPalette } from '@/components/shared/CommandPalette'
```

- [ ] **6.2** Render `<CommandPalette />` once at the root of the app shell, outside the router's active route content but inside the providers.

### Step 7: Restyle sidebar

- [ ] **7.1** Open `src/components/layout/Sidebar.tsx` (or the equivalent — search with `grep -r "Sidebar" src/components/layout` first if the filename differs). Restructure into sectioned groups:

```tsx
import {
  Home,
  Users,
  GraduationCap,
  ScrollText,
  BarChart3,
  Mail,
  Shield,
  HeartHandshake,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { LogoMark } from '@/components/brand/LogoMark'
import { NeedHelpCard } from './NeedHelpCard'

interface NavItem {
  to: string
  icon: typeof Home
  labelKey: string
}

interface NavSection {
  titleKey: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    titleKey: 'nav.sections.programs',
    items: [
      { to: '/app', icon: Home, labelKey: 'nav.dashboard' },
      { to: '/app/courses', icon: GraduationCap, labelKey: 'nav.courses' },
      { to: '/app/certificates', icon: ScrollText, labelKey: 'nav.certificates' },
    ],
  },
  {
    titleKey: 'nav.sections.people',
    items: [
      { to: '/app/students', icon: Users, labelKey: 'nav.students' },
      { to: '/app/teachers', icon: Users, labelKey: 'nav.teachers' },
      { to: '/app/enrollments', icon: HeartHandshake, labelKey: 'nav.enrollments' },
    ],
  },
  {
    titleKey: 'nav.sections.reports',
    items: [
      { to: '/app/reports', icon: BarChart3, labelKey: 'nav.reports' },
      { to: '/app/grades', icon: BarChart3, labelKey: 'nav.grades' },
      { to: '/app/attendance', icon: BarChart3, labelKey: 'nav.attendance' },
      { to: '/app/tcu', icon: BarChart3, labelKey: 'nav.tcu' },
      { to: '/app/bulk-email', icon: Mail, labelKey: 'nav.bulkEmail' },
      { to: '/app/audit', icon: Shield, labelKey: 'nav.audit' },
    ],
  },
]

export function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 px-4">
        <LogoMark variant="full" size="sm" />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.titleKey} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(section.titleKey)}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive &&
                      'bg-accent text-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:rounded-r-sm before:bg-primary'
                  )
                }
              >
                <item.icon size={18} />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-3">
        <NeedHelpCard />
      </div>
    </aside>
  )
}
```

- [ ] **7.2** Add locale keys under `nav.sections`:

```json
"sections": {
  "programs": "Programs",
  "people": "People",
  "reports": "Reports"
}
```

ES:

```json
"sections": {
  "programs": "Programas",
  "people": "Personas",
  "reports": "Reportes"
}
```

### Step 8: `NeedHelpCard`

- [ ] **8.1** Create `src/components/layout/NeedHelpCard.tsx`:

```tsx
import { LifeBuoy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function NeedHelpCard() {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg bg-gradient-to-br from-brand-green-50 to-card p-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-600">
        <LifeBuoy size={18} />
      </div>
      <p className="text-sm font-semibold text-foreground">{t('common.help.title')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('common.help.body')}</p>
      <a
        href="https://github.com/rjwrld/FundaVida"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
      >
        {t('common.help.cta')}
      </a>
    </div>
  )
}
```

Add locale keys:

```json
"help": {
  "title": "Need help?",
  "body": "Have questions about the rebuild? The source is on GitHub.",
  "cta": "View the repo →"
}
```

ES:

```json
"help": {
  "title": "¿Necesitas ayuda?",
  "body": "¿Preguntas sobre la rearquitectura? El código está en GitHub.",
  "cta": "Ver el repo →"
}
```

### Step 9: Restyle header

- [ ] **9.1** Open `src/components/layout/Header.tsx`. Rebuild as:

```tsx
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { UserMenu } from '@/components/layout/UserMenu'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { useCommandPalette } from '@/hooks/useCommandPalette'

export function Header() {
  const { t } = useTranslation()
  const { setOpen } = useCommandPalette()
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <Breadcrumbs />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Search size={14} />
          <span className="hidden md:inline">{t('common.search')}</span>
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
        <LanguageToggle />
        <UserMenu />
      </div>
    </header>
  )
}
```

Create `Breadcrumbs` component separately if it doesn't exist (`src/components/layout/Breadcrumbs.tsx`) using `useMatches` from React Router. Keep it simple: render the current route's title derived from a route-to-label map.

### Step 10: Route transitions

- [ ] **10.1** Open `src/App.tsx`. Wrap the `<Outlet />` or route rendering with `AnimatePresence`:

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { fadeUp, transitionDefaults } from '@/lib/motion'

function AnimatedOutlet() {
  const location = useLocation()
  const outlet = useOutlet()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={transitionDefaults}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
```

Replace `<Outlet />` in the admin layout with `<AnimatedOutlet />`.

### Step 11: Integrate PageHeader across admin pages

- [ ] **11.1** For each admin page in `src/pages/*.tsx` (17 pages), replace the current ad-hoc page title with `<PageHeader>`:

```tsx
import { PageHeader } from '@/components/shared/PageHeader'

// Inside the page component:
;<PageHeader
  title={t('students.title')}
  description={t('students.description')}
  action={<Button>{t('students.addNew')}</Button>}
/>
```

Do this as a mechanical sweep. If a page previously had no description, introduce one in both locales. Keep this PR focused: don't restyle tables or anything else yet — that's PR 6.

- [ ] **11.2** Delete the now-unused page-title ad-hoc markup from each page.

### Step 12: Run gauntlet

- [ ] **12.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

### Step 13: Manual smoke

- [ ] **13.1** Start dev server, verify:
  - Cmd+K / Ctrl+K opens palette; Esc closes.
  - Sidebar sections render with group headers; active route has accent bar.
  - Dropdowns on table rows don't overlap the row (open an action menu on Students list).
  - Route transitions play `fadeUp` on navigation.
  - PageHeader appears on every admin page.

### Step 14: Commit

- [ ] **14.1:**

```bash
git add src/App.tsx src/hooks/useCommandPalette.ts \
  src/components/shared/CommandPalette.tsx src/components/shared/__tests__/CommandPalette.test.tsx \
  src/components/ui/command.tsx src/components/ui/dropdown-menu.tsx src/components/ui/popover.tsx \
  src/components/layout src/pages src/locales/en.json src/locales/es.json
git commit -m "feat: restyle sidebar and header, add cmd-k palette, fix dropdown collisions"
```

### Step 15: Push + PR

- [ ] **15.1:**

```bash
git push -u origin feat/phase-8-navigation
gh pr create --title "feat: restyle sidebar and header, add cmd-k palette, fix dropdown collisions" --body "$(cat <<'EOF'
## Summary
- Sidebar restructured into sectioned groups (Programs / People / Reports) with brand-green active accent bar and Need Help promo card.
- Header rebuilt with breadcrumbs, search-as-palette trigger, theme toggle, language toggle, user menu.
- Cmd+K / Ctrl+K command palette with navigation and theme actions, bilingual.
- Global DropdownMenuContent + PopoverContent defaults: collision-padding, end-align, 4px side offset. Fixes dropdown-over-table-row bug.
- AnimatePresence route transitions via fadeUp preset.
- PageHeader integrated across 17 admin pages.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build
- [x] Manual: Cmd+K opens palette, sidebar accent correct, dropdowns don't overlap rows, route fadeUp plays
EOF
)"
```

- [ ] **15.2** Stop at PR.

---

## Task 5: Dashboard homepage redesign

**Branch:** `feat/phase-8-dashboard`

**Goal:** Rewrite `/app` as the flagship view using PR 3 components: welcome banner, stat row, bento, right panel.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-dashboard
```

### Step 2: Data selectors

- [ ] **2.1** Check `src/data/store.ts` and existing `src/hooks/api/` for hooks that surface: student count, active course count, certificates issued, TCU hours, recent audit entries, top courses by enrollment, pending-approval count, attendance rate. If any are missing, add pure selector hooks in `src/hooks/api/useDashboardStats.ts`:

```ts
import { useMemo } from 'react'
import { useStore } from '@/data/store'

export function useDashboardStats() {
  const { students, courses, certificates, tcu, auditLog, enrollments, attendance } = useStore()
  return useMemo(() => {
    const totalStudents = students.length
    const activeCourses = courses.filter((c) => c.status === 'active').length
    const certsIssued = certificates.length
    const tcuHours = tcu.reduce((sum, t) => sum + t.hours, 0)
    const pendingApprovals = certificates.filter((c) => c.status === 'pending').length
    const recentActivity = auditLog.slice(-5).reverse()
    const topCourses = [...courses]
      .map((c) => ({
        ...c,
        enrollmentCount: enrollments.filter((e) => e.courseId === c.id).length,
      }))
      .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
      .slice(0, 3)
    const attendanceRate =
      attendance.length === 0
        ? 0
        : Math.round(
            (attendance.filter((a) => a.status === 'present').length / attendance.length) * 100
          )
    return {
      totalStudents,
      activeCourses,
      certsIssued,
      tcuHours,
      pendingApprovals,
      recentActivity,
      topCourses,
      attendanceRate,
    }
  }, [students, courses, certificates, tcu, auditLog, enrollments, attendance])
}
```

Adjust field names to match actual store shape (audit your store first).

### Step 3: Dashboard sub-components

- [ ] **3.1** Create `src/components/dashboard/StatRow.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { StatCard } from '@/components/shared/StatCard'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'

export function StatRow() {
  const { t } = useTranslation()
  const s = useDashboardStats()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        variant="primary"
        label={t('dashboard.stats.students')}
        value={s.totalStudents}
        delta={8}
        deltaLabel={t('dashboard.stats.vsLastMonth')}
        sparkline={[20, 22, 21, 25, 28, 30, s.totalStudents]}
      />
      <StatCard
        label={t('dashboard.stats.activeCourses')}
        value={s.activeCourses}
        delta={3}
        deltaLabel={t('dashboard.stats.vsLastMonth')}
      />
      <StatCard
        label={t('dashboard.stats.certificatesIssued')}
        value={s.certsIssued}
        delta={12}
        deltaLabel={t('dashboard.stats.vsLastMonth')}
      />
      <StatCard
        label={t('dashboard.stats.tcuHours')}
        value={s.tcuHours}
        delta={-2}
        deltaLabel={t('dashboard.stats.vsLastMonth')}
      />
    </div>
  )
}
```

- [ ] **3.2** Create `src/components/dashboard/RecentActivity.tsx`:

Renders the last 5 audit-log entries with an Avatar (initials from actor), action text, and relative timestamp. Use `date-fns` `formatDistanceToNow` for "hace 2 horas" / "2 hours ago".

- [ ] **3.3** Create `src/components/dashboard/TopCourses.tsx`:

Renders 3 courses with name, enrollment count, and a progress bar (enrollment / capacity). Use the shadcn `Progress` component (add via `npx shadcn@latest add progress` if missing).

- [ ] **3.4** Create `src/components/dashboard/PendingApprovals.tsx`:

If pending count > 0: flame-yellow tonal bg, FlameCelebration-ish icon, count + CTA to `/app/certificates?status=pending`. If 0: neutral bg with a "¡Todo al día!" / "All caught up!" message.

- [ ] **3.5** Create `src/components/dashboard/AttendanceSnapshot.tsx`:

Simple card showing attendance percentage this month + a 7-day mini bar chart. Use Recharts `BarChart` with brand-green bars.

### Step 4: Rewrite `DashboardPage.tsx`

- [ ] **4.1** Replace the body of `src/pages/DashboardPage.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { FlameWelcome } from '@/components/icons/flame'
import { CalendarWidget } from '@/components/shared/CalendarWidget'
import { UpcomingList } from '@/components/shared/UpcomingList'
import { StatRow } from '@/components/dashboard/StatRow'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { TopCourses } from '@/components/dashboard/TopCourses'
import { PendingApprovals } from '@/components/dashboard/PendingApprovals'
import { AttendanceSnapshot } from '@/components/dashboard/AttendanceSnapshot'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
import { fadeUp, staggerContainer, transitionDefaults } from '@/lib/motion'

export function DashboardPage() {
  const { t } = useTranslation()
  const s = useDashboardStats()

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-6 xl:grid-cols-[1fr_280px]"
    >
      <div className="space-y-6">
        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <WelcomeBanner
            greeting={t('dashboard.welcome.greeting', { name: 'Administrador' })}
            context={t('dashboard.welcome.context', {
              pending: s.pendingApprovals,
            })}
            action={<Button>{t('dashboard.welcome.cta')}</Button>}
            illustration={<FlameWelcome size={120} className="text-brand-green-400" />}
          />
        </motion.div>

        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <StatRow />
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <RecentActivity />
          <TopCourses />
          <PendingApprovals />
          <AttendanceSnapshot />
        </motion.div>
      </div>

      <aside className="space-y-6">
        <CalendarWidget />
        <UpcomingList
          items={
            [
              // Derive from store: certificate deadlines, class starts, TCU checkins
            ]
          }
        />
      </aside>
    </motion.div>
  )
}
```

Replace the `UpcomingList` `items` stub with real data derived from the store (upcoming course starts, pending certificate reviews, TCU submissions due).

### Step 5: Locale keys for dashboard

- [ ] **5.1** Add `dashboard.*` keys to `en.json` and `es.json`:

EN:

```json
"dashboard": {
  "welcome": {
    "greeting": "Hi, {{name}}! 👋",
    "context": "You have {{pending}} certificates pending review.",
    "cta": "Review certificates"
  },
  "stats": {
    "students": "Total students",
    "activeCourses": "Active courses",
    "certificatesIssued": "Certificates issued",
    "tcuHours": "TCU hours",
    "vsLastMonth": "vs last month"
  },
  "recentActivity": { "title": "Recent activity" },
  "topCourses": { "title": "Top courses" },
  "pendingApprovals": {
    "title": "Pending approvals",
    "zero": "All caught up!",
    "cta": "Review"
  },
  "attendance": { "title": "Attendance this month" }
}
```

Spanish mirror.

### Step 6: Update dashboard test

- [ ] **6.1** Open `src/pages/__tests__/DashboardPage.test.tsx`. Update assertions:
  - Welcome banner greeting visible
  - Stat row shows all 4 labels
  - At least one recent-activity row renders
  - Right panel (calendar + upcoming list) visible

### Step 7: Gauntlet + manual smoke

- [ ] **7.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

- [ ] **7.2** Start dev server. Navigate to `/app`. Verify:
  - Welcome banner with flame illustration renders.
  - 4 stat cards with sparklines + animated numbers on mount.
  - Bento section (recent activity, top courses, pending, attendance) renders in 2×2.
  - Right panel (calendar + upcoming) visible on xl+, hidden below.
  - Fade-up entrance stagger plays on mount.
  - Dark mode: all cards readable.

### Step 8: Commit

- [ ] **8.1:**

```bash
git add src/pages/DashboardPage.tsx src/components/dashboard \
  src/hooks/api/useDashboardStats.ts src/locales/en.json src/locales/es.json \
  src/pages/__tests__/DashboardPage.test.tsx
git commit -m "feat: redesign dashboard with welcome banner, stat cards, bento, side panel"
```

### Step 9: Push + PR

- [ ] **9.1:**

```bash
git push -u origin feat/phase-8-dashboard
gh pr create --title "feat: redesign dashboard with welcome banner, stat cards, bento, side panel" --body "$(cat <<'EOF'
## Summary
- WelcomeBanner with role-aware greeting, dynamic context line, FlameWelcome illustration.
- Stat row: 4 cards (Students, Active Courses, Certificates, TCU Hours) with AnimatedNumber + sparkline + delta.
- Bento section 2×2: Recent Activity, Top Courses, Pending Approvals, Attendance Snapshot.
- Right panel: CalendarWidget + UpcomingList (xl+ only; collapses mobile).
- Framer Motion fadeUp staggered entrance.
- New useDashboardStats selector hook.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build
- [x] Manual: dashboard renders all sections, dark mode, stagger plays
EOF
)"
```

- [ ] **9.2** Stop at PR.

---

## Task 6: List pages unified pattern

**Branch:** `feat/phase-8-list-pages`

**Goal:** Apply unified table pattern to all 8 list pages (Students, Courses, Teachers, Enrollments, Grades, Attendance, AuditLogs, TCU). Ship 6 illustrated empty states.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-list-pages
```

### Step 2: Prepare empty-state illustrations

- [ ] **2.1** Visit [undraw.co](https://undraw.co). Download 6 SVGs with titles roughly matching:
  - Students → "Researching" or "Team work"
  - Courses → "Studying" or "Lesson time"
  - Certificates → "Certificate" or "Award"
  - Teachers → "Online learning" or "Lecture"
  - Reports → "Dashboard" or "Data report"
  - Audit Logs → "Timeline" or "Logs"

- [ ] **2.2** Open each SVG, replace the primary fill color (usually `#6C63FF` for undraw purple) with brand-green 500 (`#32982D`) and brand-blue 500 (`#2961CD`) where secondary elements need contrast. Save to `public/illustrations/{students,courses,certificates,teachers,reports,audit-logs}.svg`.

- [ ] **2.3** Run `npx svgo public/illustrations/*.svg` to minify.

### Step 3: Empty-state components

- [ ] **3.1** Create `src/components/empty-states/StudentsEmpty.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  onAdd?: () => void
}

export function StudentsEmpty({ onAdd }: Props) {
  const { t } = useTranslation()
  return (
    <EmptyState
      illustration={<img src="/illustrations/students.svg" alt="" className="w-60" />}
      heading={t('students.empty.heading')}
      body={t('students.empty.body')}
      action={onAdd && <Button onClick={onAdd}>{t('students.empty.cta')}</Button>}
    />
  )
}
```

- [ ] **3.2** Create the five siblings following the same pattern: `CoursesEmpty`, `CertificatesEmpty`, `TeachersEmpty`, `ReportsEmpty`, `AuditLogsEmpty`. Each references its own illustration + locale keys under `{module}.empty.{heading,body,cta}`.

### Step 4: Unified list-page pattern

- [ ] **4.1** For each of the 8 list pages (`StudentsListPage.tsx`, `CoursesListPage.tsx`, etc.), apply this structure:

```tsx
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { StudentsEmpty } from '@/components/empty-states/StudentsEmpty'
import { StudentsTable } from '@/components/students/StudentsTable'
// ... etc

export function StudentsListPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useStudents()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => /* filter logic */, [data, query])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t('students.title')} · ${data?.length ?? 0}`}
        description={t('students.description')}
        action={
          <Button>
            <Plus size={16} className="mr-2" />
            {t('students.addNew')}
          </Button>
        }
      />
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('students.searchPlaceholder')}
            className="pl-9"
          />
        </div>
      </div>
      {isLoading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : filtered.length === 0 ? (
        <StudentsEmpty onAdd={() => navigate('/app/students/new')} />
      ) : (
        <StudentsTable data={filtered} />
      )}
    </div>
  )
}
```

- [ ] **4.2** In each module's existing `*Table.tsx` (or wherever the table is rendered), adjust:
  - Row height: `className="h-12"` on `<TableRow>`.
  - Header: `className="bg-muted/50"`.
  - Hover: `className="hover:bg-muted/40 cursor-pointer"` where row is clickable.
  - Numeric columns: `className="text-right font-mono"`.
  - Status columns: use `Badge` status-pill variants (add variants to `src/components/ui/badge.tsx` if missing — `success`, `warning`, `info`, `destructive`, `neutral` with soft bg + saturated fg + optional dot).
  - Action column: `<DropdownMenu>` with right-aligned trigger; since PR 4 fixed collision defaults, no local override needed.

### Step 5: Badge variants (if not already added)

- [ ] **5.1** Update `src/components/ui/badge.tsx`. Add variants:

```tsx
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        success:
          'bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-900 dark:text-brand-green-200',
        warning:
          'bg-flame-yellow-50 text-flame-yellow-700 dark:bg-flame-yellow-900 dark:text-flame-yellow-200',
        info: 'bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-900 dark:text-brand-blue-200',
        destructive:
          'bg-flame-red-50 text-flame-red-700 dark:bg-flame-red-900 dark:text-flame-red-200',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ variant, dot, children, ...props }: BadgeProps & { dot?: boolean }) {
  return (
    <span className={badgeVariants({ variant })} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
```

### Step 6: Empty-state locale keys

- [ ] **6.1** For each of the 6 modules, add locale keys. EN example for Students:

```json
"empty": {
  "heading": "No students yet",
  "body": "Add your first student to get started with enrollments and certificates.",
  "cta": "Add student"
}
```

ES mirror:

```json
"empty": {
  "heading": "Aún no hay estudiantes",
  "body": "Agrega el primer estudiante para comenzar con matrículas y certificados.",
  "cta": "Agregar estudiante"
}
```

Repeat for courses, certificates, teachers, reports, audit.

### Step 7: Gauntlet + audit

- [ ] **7.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

- [ ] **7.2** Manual sweep: visit each list page. Verify:
  - PageHeader renders with correct title + count + primary CTA.
  - Search input filters rows.
  - Empty state renders when search yields no results OR initial data is empty.
  - Row height 48px, numeric columns right-aligned monospace.
  - Status-pill columns use soft-tinted backgrounds.
  - Action dropdown opens and doesn't obscure the active row.
  - Loading state shows skeleton table, not a spinner.

### Step 8: Commit

- [ ] **8.1:**

```bash
git add src/pages src/components/empty-states src/components/ui/badge.tsx \
  public/illustrations src/locales/en.json src/locales/es.json
git commit -m "feat: apply unified table pattern and illustrated empty states to list pages"
```

### Step 9: Push + PR

- [ ] **9.1:**

```bash
git push -u origin feat/phase-8-list-pages
gh pr create --title "feat: apply unified table pattern and illustrated empty states to list pages" --body "$(cat <<'EOF'
## Summary
- Unified table pattern across Students, Courses, Teachers, Enrollments, Grades, Attendance, Audit Logs, TCU (8 pages).
- 48px rows, muted header tint, hover tint, right-aligned monospace numeric columns, status-pill columns, action dropdown with global collision fix.
- 6 illustrated empty states (recolored unDraw SVGs in public/illustrations/).
- Badge status-pill variants (success, warning, info, destructive, neutral) with optional dot.
- Skeleton tables replace spinners.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build
- [x] Manual: every list page audited
EOF
)"
```

- [ ] **9.2** Stop at PR for Task 6.

---

## Task 7: Reports bento + Certificates grid

**Branch:** `feat/phase-8-reports-certs`

**Goal:** Convert Reports to a 4×3 bento with brand-ramp charts. Convert Certificates to a grid-of-cards default view with Framer Motion preview modal.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-reports-certs
```

### Step 2: Reports charts

- [ ] **2.1** Create `src/components/reports/EnrollmentTrendChart.tsx`:

```tsx
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'

interface Point {
  month: string
  current: number
  prior: number
}

export function EnrollmentTrendChart({ data }: { data: Point[] }) {
  const { t } = useTranslation()
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(var(--chart-1))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="oklch(var(--chart-1))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
        <XAxis dataKey="month" stroke="oklch(var(--muted-foreground))" tick={{ fontSize: 12 }} />
        <YAxis stroke="oklch(var(--muted-foreground))" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: 'oklch(var(--popover))',
            border: '1px solid oklch(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Area
          type="monotone"
          dataKey="current"
          stroke="oklch(var(--chart-1))"
          strokeWidth={2}
          fill="url(#gradGreen)"
          name={t('reports.enrollmentTrend.currentYear')}
        />
        <Area
          type="monotone"
          dataKey="prior"
          stroke="oklch(var(--chart-2))"
          strokeWidth={1}
          strokeDasharray="4 4"
          fill="none"
          name={t('reports.enrollmentTrend.priorYear')}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **2.2** Create `src/components/reports/AttendanceHeatmap.tsx`:

7-column × 12-row grid. Each cell is a 16px square colored by attendance rate: 0–25% flame-red-200, 25–50% flame-yellow-200, 50–75% brand-green-200, 75–100% brand-green-500. Tooltip on hover shows exact date + rate.

- [ ] **2.3** Create `src/components/reports/AverageGradeDonut.tsx`: Recharts `PieChart` with inner radius 60%, center label showing the average (large Geist Mono number + "promedio" caption). Single arc using `chart-1`; remaining `muted`.

- [ ] **2.4** Create `src/components/reports/TcuProgressRing.tsx`: plain SVG with two concentric circles, front one animated via `stroke-dasharray`. Center shows `completed/target`.

- [ ] **2.5** Create `src/components/reports/TopCoursesBar.tsx`: Recharts horizontal `BarChart`. Top 5 courses by enrollment, bars using `chart-1`, labels right of bars in monospace.

### Step 3: Rewrite `ReportsPage.tsx`

- [ ] **3.1** Replace body of `src/pages/ReportsPage.tsx` with a 12-col grid composition rendering: enrollment trend (span 8×2), attendance heatmap (span 4×2), average grade donut, TCU ring, certs this month big number, top courses bar (span 8), upcoming list (span 4). Each inside `Card` with `CardHeader/Title` + `CardContent`. Wrap in `PageHeader` at top.

### Step 4: `useReportsData` hook

- [ ] **4.1** Create `src/hooks/api/useReportsData.ts` aggregating: `enrollmentTrend[]`, `attendance[]`, `averageGrade`, `tcuCompleted`, `tcuTarget`, `certsThisMonth`, `certsDelta`, `topCourses[]`, `upcoming[]` from the Zustand store via `useMemo`.

### Step 5: Print stylesheet

- [ ] **5.1** Append to `src/index.css`:

```css
@media print {
  aside,
  header,
  [data-sidebar],
  [data-command-palette] {
    display: none !important;
  }
  main {
    margin: 0 !important;
    padding: 1rem !important;
  }
  .no-print {
    display: none !important;
  }
}
```

### Step 6: Certificates grid view

- [ ] **6.1** Create `src/components/certificates/CertificateCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  cert: {
    id: string
    studentName: string
    courseName: string
    issuedAt: string
    status: 'issued' | 'pending'
  }
  onClick: () => void
}

export function CertificateCard({ cert, onClick }: Props) {
  const { t } = useTranslation()
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-elevated"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-green-50 to-card">
        <FileText size={48} className="text-brand-green-400" aria-hidden />
      </div>
      <CardContent className="p-4">
        <p className="truncate text-sm font-semibold text-foreground">{cert.studentName}</p>
        <p className="truncate text-xs text-muted-foreground">{cert.courseName}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{cert.issuedAt}</span>
          <Badge variant={cert.status === 'issued' ? 'success' : 'warning'} dot>
            {t(`certificates.status.${cert.status}`)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **6.2** Rewrite `src/pages/CertificatesListPage.tsx` to render a responsive grid of `CertificateCard`s plus `PageHeader`, search bar (filter by student name), empty state (`CertificatesEmpty`), and `SkeletonCard` grid during loading. Keep existing preview dialog opening on click; update per Step 7.

### Step 7: Framer Motion preview dialog

- [ ] **7.1** In `src/components/certificates/CertificatePreviewDialog.tsx`, wrap Radix `Dialog.Content` with `motion.div` using `scaleIn` preset:

```tsx
<DialogPrimitive.Portal>
  <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
  <DialogPrimitive.Content asChild>
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={transitionDefaults}
      className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-elevated"
    >
      {/* PDFViewer + close + download */}
    </motion.div>
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
```

### Step 8: Locale keys for reports

- [ ] **8.1** Add `reports.*` keys. EN:

```json
"reports": {
  "title": "Reports",
  "description": "Cross-cutting metrics and trends.",
  "enrollmentTrend": {
    "title": "Enrollment trend",
    "currentYear": "Current year",
    "priorYear": "Prior year"
  },
  "attendanceHeatmap": { "title": "Attendance heatmap" },
  "averageGrade": { "title": "Average grade" },
  "tcuProgress": { "title": "TCU progress" },
  "certsThisMonth": { "title": "Certificates this month" },
  "topCourses": { "title": "Top courses" },
  "upcoming": { "title": "Upcoming milestones" }
}
```

ES mirror.

### Step 9: Gauntlet + manual

- [ ] **9.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build
```

- [ ] **9.2** Manual:
  - `/app/reports` renders 7 bento cells, responsive collapse clean on mobile.
  - All charts use brand-green / brand-blue / flame-yellow (no purples/pinks).
  - `/app/certificates` shows grid-of-cards; click card opens preview with scale-in.
  - Print preview (`Cmd+P`) hides sidebar/header.
  - Dark mode verified.

### Step 10: Commit + PR

- [ ] **10.1:**

```bash
git add src/pages/ReportsPage.tsx src/pages/CertificatesListPage.tsx \
  src/components/reports src/components/certificates \
  src/hooks/api/useReportsData.ts src/index.css \
  src/locales/en.json src/locales/es.json
git commit -m "feat: redesign reports as bento and certificates as grid with motion preview"
```

- [ ] **10.2:**

```bash
git push -u origin feat/phase-8-reports-certs
gh pr create --title "feat: redesign reports as bento and certificates as grid with motion preview" --body "$(cat <<'EOF'
## Summary
- Reports: 4×3 bento with 7 cells — enrollment trend area chart, attendance heatmap, average-grade donut, TCU progress ring, certs-this-month big number, top courses horizontal bar, upcoming milestones list.
- All charts use monochromatic brand ramps via chart-1..5 tokens.
- Print stylesheet strips sidebar/header for clean print.
- Certificates: grid-of-cards default view; PDF preview dialog wrapped in Framer Motion scaleIn.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build
- [x] Manual: reports + certificates in both themes
EOF
)"
```

- [ ] **10.3** Stop at PR.

---

## Task 8: Landing page full redesign

**Branch:** `feat/phase-8-landing`

**Goal:** Rebuild landing with aurora hero, isometric illustration, bento features, delta section, marquee, final CTA. Regenerate screenshots at the end.

### Step 1: Branch

- [ ] **1.1:**

```bash
git checkout main && git pull origin main && git checkout -b feat/phase-8-landing
```

### Step 2: `AuroraBackground`

- [ ] **2.1** Create `src/components/landing/AuroraBackground.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AuroraBackground({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="aurora pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 0%, oklch(var(--brand-green-300)) 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 80% 20%, oklch(var(--brand-blue-300)) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 80%, oklch(var(--flame-yellow-200)) 0%, transparent 60%)',
          animation: 'aurora-drift 20s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  )
}
```

### Step 3: `NumberTicker`

- [ ] **3.1** Create `src/components/landing/NumberTicker.tsx`:

```tsx
import { useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export function NumberTicker({
  value,
  duration = 1500,
  format,
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {format ? format(display) : display.toLocaleString()}
    </span>
  )
}
```

### Step 4: `Marquee`

- [ ] **4.1** Create `src/components/landing/Marquee.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Marquee({
  children,
  reverse,
  pauseOnHover = true,
  className,
}: {
  children: ReactNode
  reverse?: boolean
  pauseOnHover?: boolean
  className?: string
}) {
  return (
    <div className={cn('group flex overflow-hidden [--duration:20s] [--gap:1rem]', className)}>
      <div
        className={cn(
          'flex shrink-0 justify-around gap-[--gap] [animation:marquee_var(--duration)_linear_infinite]',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]'
        )}
      >
        {children}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **4.2** Add marquee keyframe to `tailwind.config.ts` under `keyframes`:

```ts
marquee: {
  from: { transform: 'translateX(0)' },
  to: { transform: 'translateX(-100%)' },
},
```

### Step 5: `BentoGrid`

- [ ] **5.1** Create `src/components/landing/BentoGrid.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid auto-rows-[16rem] grid-cols-1 gap-4 md:grid-cols-2', className)}>
      {children}
    </div>
  )
}

export function BentoCell({
  children,
  className,
  span = 1,
}: {
  children: ReactNode
  className?: string
  span?: 1 | 2
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated',
        span === 2 && 'md:col-span-2',
        className
      )}
    >
      {children}
    </div>
  )
}
```

### Step 6: `Hero`

- [ ] **6.1** Rewrite `src/components/landing/Hero.tsx`:

```tsx
import { motion } from 'framer-motion'
import { ArrowRight, Github } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AuroraBackground } from './AuroraBackground'
import { fadeUp, staggerContainer, transitionDefaults } from '@/lib/motion'

export function Hero() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AuroraBackground className="min-h-[90vh]">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="container mx-auto grid gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-32"
      >
        <div className="flex flex-col justify-center">
          <motion.p
            variants={fadeUp}
            transition={transitionDefaults}
            className="mb-4 text-sm font-medium uppercase tracking-widest text-primary"
          >
            {t('landing.hero.eyebrow')}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={transitionDefaults}
            className="font-display text-6xl leading-tight tracking-tight text-foreground md:text-7xl"
          >
            {t('landing.hero.headline')}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={transitionDefaults}
            className="mt-6 max-w-xl text-lg text-muted-foreground"
          >
            {t('landing.hero.subhead')}
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={transitionDefaults}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button
              size="lg"
              onClick={() => navigate('/app')}
              className="gap-2 shadow-glow-primary"
            >
              {t('landing.hero.primaryCta')}
              <ArrowRight size={16} />
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/rjwrld/FundaVida"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <Github size={16} />
                {t('landing.hero.secondaryCta')}
              </a>
            </Button>
          </motion.div>
          <motion.p
            variants={fadeUp}
            transition={transitionDefaults}
            className="mt-4 text-xs text-muted-foreground"
          >
            {t('landing.hero.noSignup')}
          </motion.p>
        </div>
        <motion.div
          variants={fadeUp}
          transition={{ ...transitionDefaults, delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <img
            src="/illustrations/landing-hero.svg"
            alt={t('landing.hero.illustrationAlt')}
            className="float w-full max-w-lg"
          />
        </motion.div>
      </motion.div>
    </AuroraBackground>
  )
}
```

### Step 7: 3D isometric hero illustration

- [ ] **7.1** Craft `public/illustrations/landing-hero.svg` — an isometric scene showing a dashboard card (student list + stat card visible), a certificate, and a stylized flame figure. Use brand-green 500, brand-blue 500, flame-yellow 500, off-white.

Options:

- **A (best):** Figma-drafted, 2-3 hours. Export optimized SVG.
- **B:** Figma Community search "3D isometric dashboard", pick permissively-licensed, recolor to brand.
- **C:** Storytale / IconScout paid asset, recolor.

Include dark-mode variant via inline `<style>` with `@media (prefers-color-scheme: dark)` swapping background fills.

Commit only after the illustration reads as polished. Stub below for initial scaffolding:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
  <style>
    .bg { fill: oklch(0.97 0.02 138); }
    @media (prefers-color-scheme: dark) {
      .bg { fill: oklch(0.26 0.08 138); }
    }
  </style>
  <rect class="bg" x="20" y="60" width="360" height="280" rx="24" />
  <!-- Replace with full isometric scene before commit -->
</svg>
```

### Step 8: `TrustStrip`

- [ ] **8.1** Create `src/components/landing/TrustStrip.tsx`:

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, staggerContainer, transitionDefaults } from '@/lib/motion'
import { NumberTicker } from './NumberTicker'

const stats = [
  { key: 'modules', value: 8 },
  { key: 'locales', value: 2 },
  { key: 'tests', value: 167 },
  { key: 'backends', value: 0 },
]

export function TrustStrip() {
  const { t } = useTranslation()
  return (
    <section className="border-y border-border bg-muted/30 py-16">
      <div className="container mx-auto px-6 lg:px-10">
        <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t('landing.trustStrip.headline')}
        </h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.key}
              variants={fadeUp}
              transition={transitionDefaults}
              className="text-center"
            >
              <NumberTicker value={stat.value} className="font-display text-5xl text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`landing.trustStrip.stat.${stat.key}`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

### Step 9: `FeatureBento`

- [ ] **9.1** Create `src/components/landing/FeatureBento.tsx` replacing `FeaturePreview.tsx`. 4 cells: large CRUD cell (span 2) with embedded students screenshot, PDF cell (tonal flame), bilingual cell (tonal blue), deterministic data cell (span 2) with `faker.seed(42)` code sample.

### Step 10: `RearchitectureDelta`

- [ ] **10.1** Create `src/components/landing/RearchitectureDelta.tsx`. 5 rows (Supabase Auth → role switcher, Postgres → Zustand+localStorage, Resend → simulated, Vercel+Supabase → Vercel only, Spanish-only → bilingual). Each row is two `motion.div`s animating in from opposite sides (`fadeIn` + `x: -20` on left, `x: 20` on right), left column with strike-through styling, right column highlighted in brand green.

### Step 11: `TechStackMarquee`

- [ ] **11.1** Create `src/components/landing/TechStackMarquee.tsx` replacing `TechStack.tsx`:

```tsx
import { Marquee } from './Marquee'

const tech = [
  'React 18',
  'TypeScript',
  'Vite',
  'Tailwind CSS',
  'shadcn/ui',
  'Radix',
  'Zustand',
  'TanStack Query',
  'React Hook Form',
  'Zod',
  'React Router',
  'react-i18next',
  '@react-pdf/renderer',
  'Vitest',
  'Playwright',
  'Vercel',
]

function Badge({ label }: { label: string }) {
  return (
    <div className="mx-2 flex h-12 items-center gap-2 rounded-full border border-border bg-card px-4 font-mono text-sm text-foreground transition-colors hover:bg-brand-blue-50">
      {label}
    </div>
  )
}

export function TechStackMarquee() {
  return (
    <section className="border-y border-border py-16">
      <Marquee className="py-2">
        {tech.map((t) => (
          <Badge key={t} label={t} />
        ))}
      </Marquee>
      <Marquee reverse className="mt-2 py-2">
        {tech
          .slice()
          .reverse()
          .map((t) => (
            <Badge key={t + '-r'} label={t} />
          ))}
      </Marquee>
    </section>
  )
}
```

### Step 12: `FinalCTA`

- [ ] **12.1** Create `src/components/landing/FinalCTA.tsx`:

```tsx
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { FlameHope } from '@/components/icons/flame'
import { fadeUp, transitionDefaults } from '@/lib/motion'

export function FinalCTA() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <section className="container mx-auto px-6 py-24 lg:px-10">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={transitionDefaults}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green-50 via-card to-brand-blue-50 p-12 text-center shadow-card"
      >
        <FlameHope
          size={200}
          className="pointer-events-none absolute -right-12 -top-12 text-brand-green-100"
        />
        <h2 className="font-display text-4xl text-foreground md:text-5xl">
          {t('landing.finalCta.headline')}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          {t('landing.finalCta.subline')}
        </p>
        <Button
          size="lg"
          onClick={() => navigate('/app')}
          className="mt-8 gap-2 shadow-glow-primary"
        >
          {t('landing.finalCta.cta')}
          <ArrowRight size={16} />
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">{t('landing.hero.noSignup')}</p>
      </motion.div>
    </section>
  )
}
```

### Step 13: Rewrite `LandingPage.tsx`

- [ ] **13.1** Replace body:

```tsx
import { Hero } from '@/components/landing/Hero'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { FeatureBento } from '@/components/landing/FeatureBento'
import { RearchitectureDelta } from '@/components/landing/RearchitectureDelta'
import { TechStackMarquee } from '@/components/landing/TechStackMarquee'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <TrustStrip />
      <FeatureBento />
      <RearchitectureDelta />
      <TechStackMarquee />
      <FinalCTA />
      <LandingFooter />
    </main>
  )
}
```

### Step 14: Landing locale keys

- [ ] **14.1** Expand `landing.*` in `en.json` and `es.json`. EN:

```json
"landing": {
  "hero": {
    "eyebrow": "Educational management · Costa Rica",
    "headline": "Hope changes everything.",
    "subhead": "A production educational platform, rearchitected as a browser-only portfolio demo. No backend. No auth. Just craft.",
    "primaryCta": "Enter as admin",
    "secondaryCta": "View on GitHub",
    "noSignup": "No signup · Data lives in your browser",
    "illustrationAlt": "Isometric illustration of the FundaVida dashboard with a certificate and flame motif"
  },
  "trustStrip": {
    "headline": "Rearchitected from a production platform",
    "stat": {
      "modules": "Modules",
      "locales": "Locales",
      "tests": "Tests",
      "backends": "Backends"
    }
  },
  "featureBento": {
    "heading": "Built with the same craft as production.",
    "crud": {
      "title": "CRUD hero modules",
      "caption": "Students, courses, and certificates with optimistic updates, localized validation, and keyboard navigation."
    },
    "pdf": {
      "title": "PDF certificates in the browser",
      "caption": "Generated and downloaded client-side via @react-pdf/renderer."
    },
    "bilingual": {
      "title": "Bilingual from day one",
      "caption": "Every module ships in English and Spanish. i18n:check gates the CI."
    },
    "deterministic": {
      "title": "Deterministic demo data",
      "caption": "faker.seed(42) means every visitor sees the same students, courses, and grades."
    }
  },
  "rearchitecture": {
    "headline": "From Supabase-backed to browser-only.",
    "rows": [
      { "before": "Supabase Auth + RLS", "after": "Role switcher (no login)" },
      { "before": "PostgreSQL + Storage", "after": "Zustand + localStorage" },
      { "before": "Resend email delivery", "after": "Simulated (logged to audit)" },
      { "before": "Vercel + Supabase hosting", "after": "Vercel only" },
      { "before": "Spanish-only UI", "after": "Bilingual EN / ES" }
    ]
  },
  "finalCta": {
    "headline": "Ready to explore?",
    "subline": "Open the admin demo. Everything runs locally in your browser.",
    "cta": "Enter as admin"
  }
}
```

ES mirror with equivalent phrasing (e.g., "La esperanza lo cambia todo.", "Ingresar como administrador", "Ver en GitHub", etc.).

### Step 15: Update landing tests

- [ ] **15.1** Update `src/components/landing/__tests__/*.test.tsx`:
  - `Hero.test.tsx`: assert headline + subhead + both CTAs render.
  - `FeatureBento.test.tsx`: assert 4 cells render.
  - `TechStackMarquee.test.tsx`: assert ≥ 16 badges in DOM.
  - `FinalCTA.test.tsx`: assert CTA wires to /app.
  - Delete obsolete `FeaturePreview.test.tsx` from Phase 7 Task 1.

### Step 16: Regenerate screenshots

- [ ] **16.1:**

```bash
npm run screenshots
```

All 8 PNGs regenerate capturing polished admin from PRs 5–7. `public/og-image.png` regenerates from new landing hero. Verify file sizes < 300 KB; compress with `npx pngquant --quality=80-95 --force --ext .png public/screenshots/*.png public/og-image.png` if any exceed.

### Step 17: Gauntlet + manual smoke

- [ ] **17.1:**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run i18n:check && npm run build && npm run e2e
```

- [ ] **17.2** Manual:
  - Landing: aurora drifts, illustration floats, stagger plays on mount, stats count up on scroll, bento hovers lift, delta animates from sides, marquee scrolls both directions, CTA card has flame watermark.
  - Both locales swap correctly.
  - Dark mode: readable, illustration variant swaps, aurora still visible.
  - Reduced motion: aurora/float/marquee frozen; entrance animations gone.
  - Mobile: hero stacks, bento collapses to single column.

### Step 18: Commit + PR

- [ ] **18.1:**

```bash
git add src/pages/LandingPage.tsx src/components/landing \
  src/locales/en.json src/locales/es.json \
  public/illustrations/landing-hero.svg public/screenshots public/og-image.png \
  tailwind.config.ts
git commit -m "feat: redesign landing with aurora hero, bento features, marquee, and final cta"
```

- [ ] **18.2:**

```bash
git push -u origin feat/phase-8-landing
gh pr create --title "feat: redesign landing with aurora hero, bento features, marquee, and final cta" --body "$(cat <<'EOF'
## Summary
- Hero: AuroraBackground, Instrument Serif headline, isometric illustration with float animation, brand-green glow primary CTA.
- Trust strip: 4 NumberTicker stats, staggered reveal on scroll.
- FeatureBento: 4 cells with tonal brand gradients and embedded screenshots.
- RearchitectureDelta: 5 before/after rows animating from opposite sides.
- TechStackMarquee: 16 badges scrolling both directions with hover-pause.
- FinalCTA: tonal gradient card with FlameHope watermark.
- Regenerated all 8 screenshots + og-image showcasing polished admin.
- Full reduced-motion support.

## Test plan
- [x] npm run typecheck · lint · format:check · test · i18n:check · build · e2e
- [x] Manual: both locales, both themes, reduced motion, mobile responsive
- [x] Screenshots regenerated, < 300 KB each
EOF
)"
```

- [ ] **18.3** Stop at PR.

---

## Phase 8 Exit Criteria

Phase 8 is complete when:

1. All 8 PRs merged to `main`.
2. `docs/brand/brand-guidelines.md` is the canonical reference.
3. Theme toggle works across all pages; both modes audited per page.
4. Landing renders aurora hero, isometric illustration, bento grid, marquee; all sections animate on scroll.
5. Dashboard shows WelcomeBanner + sparkline stat cards + bento + right panel.
6. All 8 list pages use unified pattern with illustrated empty states.
7. Reports uses bento with monochromatic brand-ramp charts.
8. Certificates defaults to grid-of-cards view.
9. `Cmd+K` command palette opens globally.
10. Dropdown menus never obscure active table rows.
11. Zero generic shadcn blue remaining — every primary token = brand green.
12. Every PR's gauntlet green.

## Post-Phase-8 handoff

Once all 8 PRs merge, resume Phase 7:

- **Phase 7 Task 4** (Vercel deploy) — deploys polished app at the Vercel subdomain.
- **Phase 7 Task 5** (Lighthouse CI) — thresholds tuned to new design.
- **Phase 7 Task 6** (cleanup) — final sweep.

After Phase 7 closes, the portfolio is LinkedIn-shareable.
