# The calendar is a role-scoped view over derived Sessions, available to every role

The calendar moves from admin-only to every role. Its event dots are derived — per ADR-0001 — from `sessionsFor()` over the viewer's _scoped_ Courses: a Student sees enrolled Courses' Sessions, a Teacher their taught Courses', an admin all. It therefore needs no new permission resource; it rides the existing Courses scope. Clicking a day opens a panel listing that day's Session(s) as Course name + ordinal ("Matemáticas — Sesión 5"); for a Teacher or admin each entry links into the Session (e.g. to mark attendance). Previously, clicking a dot did nothing. We chose riding the Courses scope over a standalone calendar permission because a Session has no existence or visibility independent of its Course (ADR-0001).

## Consequences

- One calendar component takes scoped Courses as input and is mounted for every role — on each dashboard, or a shared `/calendar` entry in the permission-derived nav (ADR-0010).
- Day-click selection state drives the side panel; an empty day shows nothing rather than an inert dot.
- No Session is stored or made visible outside its Course, so the calendar cannot leak cross-Sede or cross-Student Sessions.
