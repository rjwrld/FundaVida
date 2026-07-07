# Session exceptions are a stored overlay applied last in the derivation

_Accepted (design grilling 2026-07-07). Revisits ADR-0001 exactly as it prescribed._

Teachers need to cancel, reschedule, and add class Sessions. ADR-0001 keeps Sessions derived from Term × Meeting Days — there is no session row to edit — and it explicitly forbade bolting exception flags onto attendance records. So an edit is not a mutation of a Session; it is a new, sparse, stored fact about a deviation: a **SessionException** `{ id, courseId, type: 'cancelled' | 'rescheduled' | 'extra', date, newDate?, note?, createdAt }`, where `date` names the derived base Session being cancelled/moved (or the added date for `extra`) and `newDate` is the reschedule target. The derivation stays pure and gains one composition step: `sessionsFor(course, range)` is unchanged, and a new seam `effectiveSessions(course, exceptions, range)` applies the overlay last. Calendar (ADR-0013/0038), the state-grouped Sessions surface (ADR-0037), attendance marking, and close-readiness (ADR-0034) all switch to the composed seam, so every surface inherits an edit from one place. We rejected materializing Sessions as stored rows: it rewrites every consumer, breaks the Demo-Epoch self-healing (ADR-0002), and turns the seed into a migration problem.

Integrity rules are store-enforced (ADR-0009: check, throw, then mutate — the UI only mirrors them):

- Only Sessions that have not yet occurred (per the clock seam, ADR-0014) can be cancelled or rescheduled, and a Session with any recorded attendance is immutable. Retroactive edits would orphan attendance — rejected.
- A cancelled Session leaves the expected-session count: attendance rates, close-readiness, and certificate thresholds divide by effective Sessions, so a cancellation never penalizes the cohort.
- A reschedule target / extra date must be today-or-later and must not collide with another effective Session of the same Course; it need not land on a Meeting Day. A Course whose last effective Session is still ahead is not close-ready, even past Term end.
- Writers: the Course's own Teacher and admin, via the existing `courses` edit permission plus ownership — no new matrix resource. Mutations emit audit entries (ADR-0005) under a new `session` audit entity, and auto-post a system Announcement (ADR-0040) in the same store action.

## Consequences

- New persisted slice `sessionExceptions` ⇒ one STATE_KEY bump for this whole package (reseed, never migrate — ADR-0003), taken by the first data PR that lands; later PRs in the package ride it. Export the STATE_KEY const so e2e's `pinDemoEpoch` stops hand-mirroring it (the v3→v10 drift class).
- `effectiveSessions` is a pure lib function tested directly: cancel drops, reschedule moves (ordinal stability), extra inserts, collision/past-date/attendance-guard rejections tested at the store.
- Seed gains a few exceptions (one cancelled, one rescheduled Course) so the calendar and Sessions surface demonstrate the feature without manual setup; e2e derives expected counts by running the lib over `seedDemo()`.
- Mark-attendance must refuse a cancelled date and accept a rescheduled/extra date — its validity check moves from `sessionsFor` to `effectiveSessions`.
- ADR-0001 stays in force for the base derivation; its "revisit" clause is now discharged by this overlay.
