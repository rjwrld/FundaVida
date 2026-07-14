# Month is a term map, not a density plot

Revises the month section of ADR-0044 while keeping everything else it locked: Week stays the default and the hero, a month-day tap remains a navigator move that lands the week canvas on that week, the surface rides the existing Courses scope with no new permission (ADR-0010/0013), exceptions inherit Course visibility exactly (ADR-0039), and color stays semantic-only (the #239 Scarce Green decision, ADR-0047's two-hue status language).

**The diagnosis: density cannot vary here.** ADR-0044 asked the month grid to make "the term's shape legible at arm's length" through count-scaled event marks. But Sessions derive from Term × Meeting Days (ADR-0001), and the seeded patterns (`mon/wed`, `tue/thu`, `mon/wed/fri`, …) mean any viewer with two or more active Courses has Sessions on **every weekday of every in-term week**. A month grid of a periodic schedule is uniform by construction — there is no shape for density to reveal. The shipped marks render as identical dashes on every weekday (thinner Fridays, empty weekends, forever), and no amount of mark tuning fixes a signal that does not exist. What _does_ vary across a month in this domain is exactly three things: **cohort boundaries** (a Course's `term.start` / `term.end`), **Session exceptions** (cancelled and rescheduled days, ADR-0039), and **today**. The month view's job is to narrate those.

**The vocabulary.** Five day-types, all derivable from existing scoped reads — no new entity (a "holiday" is not modeled; a cancellation whose note says "Feriado" already tells that story):

- _Ordinary session day_ — a single small muted dot. Constant texture is fine once it stops pretending to be signal; the dots' edge is where the term visibly starts and stops.
- _Cohort start_ — a Figure-Green dot. A start is a legitimate "go" moment; green stays scarce.
- _Cohort end_ — a neutral hollow dot.
- _Cancelled Session_ — a destructive dot. _Rescheduled Session_ — a neutral dot on both the vacated day and the target day.
- _Today_ — the day-picker's existing ring, unchanged.

A notable mark **replaces** the baseline dot on its day. Several notables on one day render at most two dots then a "+" — never a pile. Cells stay glyph-only; names live in the reading layer.

**The reading layer: a "This month" milestone list.** Beside the grid, chronological rows — glyph, date, name ("Inglés Primaria — Linda Vista · starts Jul 6", "Session cancelled · Feriado"). Each row is the same navigator move a day-tap is: land the week canvas on that week. The list is also the legend — every glyph appears next to its meaning, so no separate legend chrome. On `lg+` the grid and list sit side by side, mirroring the week view's geometry; below `lg` the list follows the grid. This does **not** resurrect the day-detail panel ADR-0044 removed — that was "tap a day, see its sessions"; this narrates the month's boundaries and deviations, which the week canvas cannot show.

**Quiet states point somewhere.** A month with no milestones names the nearest milestone in each direction and offers the jump — the ADR-0044 empty-week pattern, applied to months.

**The seed makes every role's current month live.** Today the seed carries exactly two exceptions, both on one future Course of the teacher persona — a term map over that data is a second lifeless month view. Every in-progress Course gains one to two exceptions placed **deterministically** (not faker-rolled) within ±3 weeks of the Demo Epoch, mixing cancelled and rescheduled with varied notes. Because every persona's scope contains an in-progress Course (ADR-0044's seed guarantee), every role's landing month shows live milestones, and the demo never decays (ADR-0002). Cohort boundaries are already staggered monthly and are not reshaped. The existing two exceptions stay — they back the week canvas's exception rendering and its e2e. Stale snapshots reseed, never migrate (ADR-0003): **STATE_KEY v15 → v16**, the faker RNG stream shifts, and e2e anchors re-derive from `seedDemo()` — the #263 drill.

## Consequences

- Seed: deterministic exception top-up on in-progress Courses; STATE_KEY v15 → v16; e2e anchors re-derived. Ships first, alone ("stage").
- `MonthNavigator`: density scaling (`EVENT_BAR_WIDTH`, count-keyed marks) is deleted; the `events: Date[]` prop gives way to a milestones structure derived on `CalendarPage` from the already-scoped Courses + exceptions reads; baseline dot + notable glyphs with priority stacking.
- New milestone-list component sharing the day-tap's navigate-to-week callback; month layout becomes grid-plus-list on `lg+`, stacked below.
- Lib: a nearest-milestone derivation backs the quiet state (the nearest-Session pattern, applied to milestones).
- i18n: EN+ES keys for milestone row copy, list heading, and the quiet state.
- Tests: unit for milestone derivation (boundaries, both reschedule days, priority stacking) and nearest-milestone; component for list rows and glyph priority; e2e for milestone-row navigation and a per-role "current month shows at least one milestone" assertion (locators via `getByRole`, #157).
