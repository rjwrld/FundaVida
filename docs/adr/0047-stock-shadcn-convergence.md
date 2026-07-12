# The UI converges on stock shadcn: registry components, one theme file, brand as primary

_Accepted (design grilling + artifact review 2026-07-09). Amended 2026-07-10: `--success`
recorded as the second deliberate deviation, the two-hue status language settled, and the
brand-pigment rule dated to phase 2e. Amended 2026-07-12: `warning` stated as a principle
(actionable only, never historical) rather than as a single example. Supersedes the Figure-Green
token skin (PRs #102/#105/#132) as the app-wide surface treatment; ADR-0026 (Pager) and ADR-0044
(calendar layout) stand; ADR-0010 (derived nav) is untouched._

The codebase is already ~60% a shadcn app — `components.json`, 18 primitives under
`src/components/ui/`, cva/tailwind-merge/Radix — but the adoption stalled halfway and the gaps
grew organically: 31 files re-implement the Card shell by hand (10 in `dashboard/` alone), two
pages hardcode status-pill colors the extended Badge already provides, tooltips are native
`title=""` attributes, `ui/checkbox.tsx` is a plain `<input>` wearing a Radix costume, and
`components.json` still declares the deprecated `default` style with a `slate` base color that
matches nothing in `index.css`. Meanwhile the custom token skin (Frost/Paper/Ink, mono-neutralized
warning/info, 0.75rem radius) makes every registry pull a hand-adaptation. The decision, after
reviewing eleven mocked directions: stop maintaining a fork of shadcn's look and converge on the
registry's stock output, with two deliberate deviations — the brand green as primary, and a
`--success` token that stock shadcn does not ship.

## Decision

**One theme file carries the entire visual identity.** `fundavida-green` is the stock shadcn
`base` theme (zinc neutrals, 0.625rem radius, stock shadows and typography scale) with five token
groups re-pointed to Figure Green hue 138: `primary` (light `oklch(0.5 0.16 138)`, dark
`oklch(0.72 0.17 138)`), `ring`, `sidebar-primary`, and `chart-1…5` — plus one added semantic
token, `--success` (light `oklch(0.57 0.17 138)`, dark `oklch(0.68 0.16 138)`), which the status
surfaces consume as `bg-success`; registry re-pulls do not know about it and must not remove it.
Nothing else deviates. The old semantic customs die with the skin: Frost/Paper/Ink values, the
mono-neutralized `--warning`/`--info`, and the 0.75rem radius are all replaced by stock. The
filled Badge color variants restyle to the registry's outline-pill-with-status-dot. Components
must consume theme tokens only. 22 files predating this rule still reference `brand-green-*`/
`flame-*` outside the exempt surfaces; phase 2e (#335) sweeps them, and from that phase on a new
reference outside the exempt surfaces is a review rejection.

**The status language is deliberately two-hue: success and destructive carry color, everything
else is grey** (decided 2026-07-10 after reviewing both directions in mockups; the alternative
was reinstating `--warning` as a third deviation). `--warning` and `--info` stay retired. The
Badge `warning` variant keeps its solid foreground dot — actionable grey, one step louder than
`neutral`'s muted dot — as the blessed convention, not a workaround. `info` is byte-identical to
`neutral` and folds into it: the variant name is deleted with the `statusVariant` consolidation
(#332), and its call sites (`excused` attendance, `update` audit actions) remap to `neutral` — a
zero-pixel change. Surfaces that once leaned on amber render pending as grey beside the green
(the enrollment funnel's pending segment); charts color by `chart-1…5`, not by status tokens.

**`warning` means _actionable_, and only that** (amended 2026-07-12 with #347). It is the dot for
a state someone still has to resolve — a `pending` enrollment, a `pending` TCU activity. It is not
a general-purpose "noteworthy" grey. It therefore may not appear on a **historical** surface, where
every row already happened and nothing can be acted on: the audit log is the case in point, and
`grade` was using `warning` there simply because the pre-#332 if-cascade named it. Read the rule as
a question — _can the viewer do something about this row?_ If no, the choice is `neutral`. This is
the reasoning the paragraph above always implied; #347 states it so the next enum mapped to a Badge
doesn't reach for `warning` as a synonym for "important".

**Tailwind 4 goes first, because the theme file demands it.** The theme is a Tailwind-4-format
registry item (full `oklch()` values); the current Tailwind 3 plumbing wraps triplet variables in
`oklch(var(--token))`, so installing the theme before the upgrade would nest `oklch(oklch(…))`.
Phase 0 is therefore the 3.4→4 upgrade plus `components.json` repair (`new-york`, correct base
color) plus a registry re-pull of all 18 existing primitives. Local extensions that survive the
re-pull are re-applied as explicit, separately-reviewable commits: CardTitle's `as` prop
(a11y-driven), the Badge dot, and a real Radix rewrite of the fake checkbox. `scripts/screenshots.ts`
diffs before/after — Phase 0 through Phase 3 are zero-intended-visual-change except where stock
replaces custom chrome.

**Brand pigment is contained, not deleted.** The `brand-green`/`brand-blue`/`flame-*` 11-step
ramps survive only where the app is deliberately not shadcn: the marketing landing
(`src/components/landing/`) and the certificate PDF pipeline (`CertificatePreview` +
`lib/pdf/certificateTheme`), which stays light regardless of app theme. The landing/app seam —
expressive landing, stock app — is accepted on purpose.

**Structure adopts the registry's blocks.** The app shell moves to the Sidebar primitive: grouped
sections still derive from `NAV_ITEMS` and the permission matrix (ADR-0010 unchanged — the block
is presentation, the matrix is truth), the built-in mobile sheet replaces `MobileNav` (closing
#292's ≥44px touch targets as an acceptance criterion, not a separate fix), and the collapsed
icon rail (⌘B) arrives free. Breadcrumbs, ⌘K, and the theme toggle consolidate into the block's
header slot. Dashboards rebuild on stock card/chart patterns with recharts under the shadcn Chart
wrapper; the welcome/role-select view rebuilds on an auth-block layout. The ADR-0044 calendar
keeps its locked layout and re-skins onto the new primitives (its tooltips finally become
`ui/tooltip` instead of `title=""`).

**DataTable rebases onto TanStack Table with three preserved contracts.** (1) the dual render —
real table ≥sm, stacked cards below, with the Playwright strict-mode implication kept documented;
(2) framer-motion row enter/exit behind `useReducedMotion`; (3) the `Pager`/`usePagination`
integration — the Pager stays custom per ADR-0026, it is better than the stock recipe. The
existing test suite is ported first so behavior is pinned before the swap.

**Motion is a designed layer, scoped by frequency.** The rule: the showier the animation, the
rarer the moment it celebrates. A subtle base package covers high-frequency states (sliding tab
indicator, sidebar active pill and collapse spring, staggered row/card entrances, chart draw-in,
count-ups, dialog/sheet/toast transitions; 150–250ms). Expressive moments are reserved for rare,
high-emotion events: certificate issuance (confetti + shimmer), the course-close checklist cascade
with a button-to-checkmark morph, the enrollment-approval sweep, the welcome entrance with an SVG
logo stroke-draw, and a View Transitions theme-toggle wipe (progressive enhancement). A
shared-element course-card→detail morph is a stretch goal, gated on it not fighting async data
loading (the ADR-0030 resolve-queries discipline applies). Route-level page transitions were
considered and rejected — navigation is the highest-frequency action in the app. Everything
routes through `lib/motion.ts` tokens and respects `prefers-reduced-motion`.

**Delivery is a serial issue queue, not a parallel wave.** One milestone, phases 0–6 as ~18
ordered issues, each sized to one implement-skill run and reviewed before merge. Phases 0, 3, 4
touch global surfaces and must not overlap anything; the Phase 2 sweep is split into serial
file-disjoint slices.

## Consequences

- **The e2e suite is the safety net and the risk.** 95% of selectors are role/label-based and
  survive Radix swaps that preserve ARIA; the 19 `getByTestId` and 4 raw `locator` call sites are
  grepped and checked in every phase that touches their markup.
- **Not every registry swap preserves ARIA, so "role-based selectors are safe" is not a licence
  to skip the e2e run.** Phase 1a found this the hard way: `ToggleGroup type="single"` is a Radix
  `radiogroup` of `radio`s and explicitly sets `aria-pressed: undefined`, so porting
  `LanguageToggle` turned 11 spec files' `getByRole('button', { name: 'es' })` into 18 failures.
  The radiogroup is the honest ARIA for an exclusive choice and the selectors moved to
  `getByRole('radio', …)`. Every phase runs the full e2e suite before merge — a unit-green,
  typecheck-green branch says nothing about the role tree.
- **Registry re-pulls can silently clobber local extensions.** The surviving extensions are the
  explicit list above; each re-application is its own commit so a future `shadcn add` diff shows
  exactly what local delta exists.
- **No matrix, scope, api, or STATE_KEY change anywhere in the series.** This is a pure UI
  convergence; a diff touching `matrix.ts`, `scope.ts`, or persistence is over-broadening and
  should be rejected in review.
- **Radix disclosures cost Chrome's find-in-page, and it is not recoverable.** Replacing
  `<details>` with `ui/collapsible` (Phase 1a, `CourseSessionsSection`) means Ctrl+F no longer
  auto-expands collapsed content: Radix unmounts `CollapsibleContent`, and `forceMount` only
  swaps the unmount for `hidden`, which find-in-page skips the same way. `hidden="until-found"`
  cannot rescue it either — Radix hard-codes `hidden: !isOpen`, and `react-dom` treats `hidden`
  as a boolean attribute. Accepted, not worked around: the behaviour was Chrome-only (Firefox and
  Safari never auto-expanded `<details>`), and the alternative is forking a stock primitive. The
  same trade lands on every future disclosure — accordion, popover, the collapsed sidebar rail.
- The i18n surface is unchanged in meaning but touched in many files; `i18n:check` drift is the
  expected failure mode of a careless port, and locale files commit before components
  (pre-commit ordering gotcha).
- The demo's first-run experience changes visibly (Phases 4–6). Screenshot review is part of
  those phases' acceptance criteria, not an afterthought.
- Revoked decisions are recorded here so they are not re-litigated: keep-Figure-Green-everywhere,
  filled Badge variants, Ink dark palette, 0.75rem radius, and reinstating `--warning`/`--info`
  (the two-hue decision above). Revocable-but-kept: the DataTable
  mobile card render (drop only with an explicit ADR amendment).
