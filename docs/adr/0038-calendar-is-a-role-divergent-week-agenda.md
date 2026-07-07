# The calendar is a role-divergent week agenda over derived Sessions, not a month of dots

Supersedes the _UI model_ of ADR-0013 while keeping its invariants: the calendar rides the existing Courses scope (no new permission), its Sessions are derived per ADR-0001, and no Session leaks outside its Course. What changes is what the surface is _for_. The month-of-dots + click-a-day-panel model answered "which days have Sessions?" — a question no role urgently has — so it read as decorative. The calendar becomes an **actionable agenda**: it answers the question each role actually has, and the answer differs by role.

Because a Session is whole-day (`{ courseId, date, ordinal }`, no clock time), the surface is a **week canvas** of day-columns — each column a top-to-bottom stack of that day's session cards — not an hour grid. Week is the default; a **month toggle** reuses the existing `CalendarWidget`. Alongside the canvas sits a **role-scoped agenda sidebar** that carries the utility, so the surface is useful even on a light week where the canvas is sparse:

- **Teacher** — the hero is a **"Needs marking"** worklist: past recordable Sessions in taught Courses with zero attendance yet, each deep-linking to Mark Attendance. Plus upcoming.
- **Admin** — a summarized **operational pulse** (unmarked-session count, Courses ready to close) rather than a per-Session firehose across every Sede, plus this-week / upcoming.
- **Student** — **"My progress"** (attendance standing, certificate track) plus upcoming classes; past cards show the student's own attendance status. Read-only (cannot mark).
- **TCU** — a read-only upcoming schedule for the one assigned Course (ADR-0036); the role has no attendance access at all, so cards carry no status and no action.

The divergence lives in _data and card decoration_, not in new permissions or four separate pages: one calendar surface takes scoped Courses and conditions its sidebar buckets and card status on the role. "Marked vs unmarked" reuses the same rule as close-readiness (a Session is marked once any `AttendanceRecord` matches its Course+date, ADR-0034); it is factored out of `closeReadiness` into a shared `isSessionMarked` predicate. `buildStudentProgress` is extended to expose raw present/total counts (it already computes them) so the student sidebar can show "8/10 attended" rather than only a rate.

The **dashboard aside** drops the decorative month grid entirely and shows a compact slice of the same role agenda (growing from the existing `UpcomingList`) — the actionable rows, deep-linked. The inspiration's add-button, timezone chip, and notification bell are all omitted as domain-mismatched: Sessions are derived and cannot be created (ADR-0001), the demo is single-locale, and there is no notification system.

## Consequences

- One calendar surface, role-conditioned: a `WeekCanvas` (day-columns of session cards) + an `AgendaSidebar` whose buckets are chosen by role, with week/month toggle; month mode reuses `CalendarWidget`. `RoleCalendar` and `DashboardCalendar` are replaced.
- Session cards carry a course-keyed accent color, short course title, Sede, ordinal, and role-conditioned status; teacher/admin cards link to Mark Attendance, student/tcu cards are informational (ADR-0013's link-vs-read-only distinction is preserved and extended).
- New derivation seams: `isSessionMarked(courseId, date, attendance)` factored out of `closeReadiness`; `buildStudentProgress` surfaces `{ present, total }`; a role→agenda-buckets builder composes upcoming Sessions, unmarked Sessions (teacher/admin), close-readiness (admin), and progress (student). No new stored state — everything derives from already-scoped Courses + attendance.
- Responsive: desktop renders the split (sidebar + canvas); below `lg` it collapses to a single day-grouped agenda column with the sidebar buckets on top — no horizontal scrolling of a 7-column grid.
- Still no new permission and no cross-Course/Sede leak: the surface reads only scoped Courses and their derived Sessions, exactly as ADR-0013 required. The route keeps its no-`RoleGate` treatment (ADR-0010) since scope, not a permission, bounds it.
- Test surface: `RoleCalendar`/`DashboardCalendar` tests are rewritten for the new components; `CalendarPage` integration and the dashboard-calendar e2e are reworked to assert the role agenda (teacher sees a needs-marking link, student never sees another student's status, tcu sees a read-only schedule); `CalendarWidget` and its test survive as month mode.
