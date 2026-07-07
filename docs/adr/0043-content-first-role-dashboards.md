# Dashboards are content-first and role-divergent; navigation shortcut cards die

_Accepted (design grilling 2026-07-07). Sequences after 0039–0042 — it is their display surface._

The Student, Teacher, and TCU dashboards are mostly navigation shortcut cards ("Browse open courses", "My profile") — duplicating what the sidebar already derives (ADR-0010), and the profile card's job moved into the nav (Account section). Each dashboard becomes a role-divergent, live-data surface, extending to dashboards what ADR-0038 established for the calendar: divergence lives in data and composition, not in new permissions. Everything below reads existing seams — agenda buckets (ADR-0038), `buildStudentProgress` (ADR-0032), close-readiness (ADR-0024/0034), announcements (ADR-0040), display state (ADR-0042). No new stored state.

- **Student** — announcements feed across enrolled Courses; this-week agenda slice; and a **My courses table** (`buildStudentProgress` rows: Course, schedule, display-state badge, attendance %, grade, each row linking to the Course). The table answers "how am I doing where" in one glance — the roll-up ADR-0032 named Student Progress, now on the landing surface. `/app/courses` keeps its browse-and-request job; the dashboard table is the self view, so the two don't overlap.
- **Teacher** — worklist-first: needs-marking Sessions (ADR-0038's hero, deep-linked), Courses ready to close (ADR-0024), pending Certificate approvals (ADR-0019), then upcoming Sessions and their Courses with display-state badges, plus their announcements with the compose entry (ADR-0040).
- **TCU** — hour progress toward 300 (existing), the assigned Course (ADR-0036) with its upcoming schedule slice, that Course's announcements, recent activities (existing).
- **Admin** — already content-first (stat row + worklists; the heatmap was removed separately); it gains the announcements feed and display-state badges but is otherwise out of scope.

DataTable's `renderCard` dual-render applies to the new table (mobile cards; e2e locators must use `getByRole`, the known strict-mode trap), and every section that derives a verdict from multiple queries gates on `resolveQueries` (ADR-0030) — the dashboards are exactly the multi-query, default-`[]` surface where first-paint flashes breed.

## Consequences

- `StudentDashboard`, `TeacherDashboard`, `TcuDashboard` are recomposed; the shortcut cards (`browseOpenCourses`, `myProfile`, `createCourse` prompt) are deleted with their locale keys. `DashboardShell` and the admin layout survive.
- The dashboard aside already planned by ADR-0038 (compact role agenda) is part of this recomposition, not a second project.
- Empty states matter more than layouts: a student with no enrollments, a teacher with nothing to mark, a TCU trainee before any activity — each section keeps a designed empty state rather than vanishing (the existing empty-state components extend).
- Test surface: per-role dashboard tests assert the role's hero content and the absence of other roles' (student never sees needs-marking; tcu sees exactly one Course); asymmetric-delay first-paint tests on the progress table and feeds; e2e covers the student table → course-detail deep link through the a11y tree.
- Sequencing: lands last in the package — it consumes 0039 (effective sessions in agenda), 0040 (feeds), 0042 (badges); only the Teacher worklists and TCU sections could ship earlier if needed.
