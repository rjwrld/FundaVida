# Course badges show a clock-derived display state; the stored lifecycle is unchanged

_Accepted (design grilling 2026-07-07)._

`CourseStatus` (`draft | published | closed`) is a lifecycle driven by people: a Teacher authors privately, publishes deliberately, and closing is the deliberate act that emits Certificates (ADR-0024). But what a viewer wants from a badge is temporal: has this course started, is it running, is it over? "Published" answers neither, and a published Course whose Term ended reads misleadingly alive. The two axes stay separate: the enum is untouched, and badges render a **display state** derived from lifecycle × Term dates × the clock seam (ADR-0014) — a pure `courseDisplayState(course, now)`:

- `draft` → **Draft** (only authoring roles ever see drafts — ADR-0016)
- `published`, Term not started → **Starts soon**
- `published`, inside Term → **In progress**
- `published`, Term ended → **Term ended** (this is precisely the close-readiness worklist boundary, `coursesToClose`'s predicate — same date rule, one shared seam)
- `closed` → **Finished**

We rejected replacing the enum (destroys private authoring and the close-emits-certificates trigger, forces a redesign of ADR-0016/0024 plus reseed) and a label-only rename (a published-but-unstarted Course would falsely badge "In progress"). The display state renders everywhere a status badge exists today — courses list, course detail, dashboards (ADR-0043) — through one badge component so color/copy can't drift per page.

The derived state also gates enrollment: requests are accepted while a Course is **Starts soon** or **In progress** (mid-term joins match community-center reality, and attendance math already tolerates missing early Sessions) and rejected once the Term has ended — enforced in the store's enroll/request mutations beside the one-Sede check (ADR-0011), with the UI hiding the request button as defense-in-depth. Without this, a "Term ended" badge and a live "Request a spot" button would contradict each other on the same card.

## Consequences

- `courseDisplayState` lives in `src/lib/`, is pure, and is tested directly on the boundaries (day before start / start day / end day / day after; each lifecycle value). Term-end must use the exact `coursesToClose` comparison so a Course can never badge "Term ended" while not appearing in the close worklist, or vice versa.
- No store change, no STATE_KEY bump, no migration — this is presentation + one new store-enforced enrollment rule.
- Enrollment gating tests: store rejects a request against a Term-ended Course (and a closed/draft one); UI test pins the hidden request button; existing mid-term seed students keep enrolling (regression guard for the allowed window).
- i18n: `courses.displayState.*` keys in EN/ES (Borrador / Por iniciar / En curso / Término finalizado / Finalizado), resolved dynamically ⇒ `keys.ts` manifest lines are mandatory (the TCU-status bug class).
- `courses.status.*` keys remain for the authoring lifecycle where it is the subject (publish/close actions, audit copy).
