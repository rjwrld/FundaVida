# A TCU Trainee sees their assigned Course through an 'assigned' scope token

_Proposed (UX pass 2026-07-03). Extends ADR-0008/0013/0017._

A TCU Trainee serves at exactly one Course (ADR-0017), but the tcu role's `courses` scope token was `'none'` — so no seam-honoring surface could show the volunteer which Course they serve, when it meets, or where. The dashboard hero for the role showed only hour counts; the calendar (which rides the Courses scope, ADR-0013) rendered empty. The trainee record carries `courseId`, yet reading `store.courses` raw in a component would be exactly the leak ADR-0033 closed in CalendarPage.

The tcu `courses` token becomes `'assigned'`, interpreted in `applyCoursesScope`: the Courses whose id matches the current user's own trainee record's `courseId` — the mirror of the existing `'assignedTrainees'` token (a Teacher's view of volunteers) in the other direction. Visibility rules belong in the scope interpreter, not in bespoke endpoints; we rejected a purpose-built `api.tcu.assignedCourse()` aggregate because anything course-shaped the role later needs would each require another endpoint, while the token composes for free. The matrix `courses.view` cell stays false: the `/app/courses` route and nav item remain hidden (ADR-0010) — the token governs reads, not routes.

Two surfaces light up. The TCU dashboard's hero becomes the assigned-Course card — name, Sede, Meeting Days, next Session (via the `upcomingSessions` derivation, ADR-0034) — with a **Log hours** button opening the existing `LogTcuActivityDialog`, so the role's primary action lives where the role lands. And the volunteer's calendar now shows their assigned Course's Sessions — when they actually show up to serve. The calendar change is intended, not incidental: it is ADR-0013 working as designed once the role's Courses scope is non-empty.

The same pass fixes a found divergence: `TcuDashboard` counted **all** activities toward the 300-hour target while TcuListPage counts **approved only** (hour approval exists, ADR-0017) — two definitions of "hours completed" on two surfaces. The dashboard adopts approved-only with pending hours shown separately, matching the list page. The dashboard's multi-query derivation (trainee, course, activities) gates through `resolveQueries` (ADR-0030), so no default-`[]` placeholder can flash a "no course assigned" verdict.

## Consequences

- Scope-rule tests (pure `ScopeContext` literals, ADR-0033): `'assigned'` returns exactly the self-trainee's Course, `[]` for a userId with no trainee record, and never another trainee's Course.
- A first-paint asymmetric-delay test guards the dashboard gate; an activity-mix test pins approved-only progress; one calendar test pins the assigned Course's Sessions appearing for the role.
- Defensive edge: a current user with no trainee record renders the hours stats without a course card — no crash, no flash (the seed always assigns one, ADR-0017).
- No route, nav, or `STATE_KEY` change; one scope-map cell plus interpreter branch, both compile-checked through the existing seams (ADR-0031/0033 shapes).
