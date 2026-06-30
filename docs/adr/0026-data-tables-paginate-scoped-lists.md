# Data tables paginate over the scoped list; the full set is never rendered at once

_Proposed (planning milestone "Certificate lifecycle rework + UI/UX overhaul")._

Every list page renders its entire scoped result into a single `<table>` today (Students, Courses, Grades, Enrollments, Attendance, Audit Log, Certificates) — fine at seed size, but it reads as unfinished and would not hold the ~100 rows a real cohort produces. A shared pagination primitive (`DataTable`, composed over the existing `ui/table.tsx`) windows the already-scoped rows client-side, with a page-size control, optional column sort, the page's existing filters, and the mobile card-stack preserved. Pagination is presentation only: it never touches the scope seam (ADR-0008) — the API still returns the role-scoped list and the table merely windows it, so a Student's self-only view and a Teacher's own-Courses view are unchanged.

We chose client-side windowing over server-style paging because the fake-async API already returns a bounded, role-scoped array; a cursor protocol would add ceremony with no benefit at demo scale. The primitive owns the accessible affordances once — a labelled "page X of Y", keyboard-operable controls, and a single empty state — rather than each page reinventing them.

## Consequences

- One primitive is adopted across the list pages; boundary and empty states live in one place.
- No permission, scope token, or `STATE_KEY` change — the data layer is untouched.
- e2e asserts the page-size cap so a regression that dumps every row is caught (unit tests cannot see the rendered row count the way the roster bug in #87 escaped them).
