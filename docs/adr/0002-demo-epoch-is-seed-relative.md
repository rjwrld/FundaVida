# Demo Epoch is seed-relative, not a fixed date

All seeded dates are positioned relative to the moment the seed runs in the viewer's browser (the Demo Epoch): some Courses completed, some in progress, some upcoming. We chose this over a hardcoded historical epoch so the demo never decays — whenever someone opens it, the calendar shows real upcoming Sessions and "this month" metrics have data. Entity _identities_ stay deterministic via `faker.seed(42)`; only dates float.

## Consequences

- Screenshots, e2e tests, and Lighthouse runs cannot assert exact dates — assertions must be relative to "today" (e.g. "a session exists within the next 7 days"), not pinned strings.
- A returning visitor's persisted data keeps its original epoch and slowly ages until they use demo reset, which re-anchors. This drift is accepted; it only matters over months.

_Amended by ADR-0014 — the epoch becomes an explicit persisted `demoEpoch` scalar and all "now" flows through a `clock` seam. Because filters now read the frozen epoch rather than a live `new Date()`, the drift above no longer empties the demo: a returning visitor's data stays consistent with its frozen "today" until reset re-anchors._
