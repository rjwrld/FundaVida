# A Course has one Sessions surface, grouped by state; inline marking is removed

_Accepted (UX pass 2026-07-03, shaped via design brief). Consumes ADR-0030/0034; complements ADR-0018._

CoursesDetailPage rendered the same ~26 derived Sessions twice: a "Schedule" section of static, stateless chips, then a "Mark attendance" section re-listing every past Session as an undifferentiated button wall — on an ended Course, 26 buttons with no signal which ones still need attendance, even though `closeReadiness` computes exactly that verdict for the readiness checklist on the same page. Selecting a button revealed an inline roster table that duplicates `MarkSessionAttendancePage`'s entire job, with its own fourth spelling of the session-window predicate (`parseISO(s.date) <= clock.now()`). Two renderings of one concept plus two marking surfaces is the house failure mode PRODUCT.md now names ("one surface per concept").

Both sections are replaced by **one Sessions section, grouped by state, workflow first**: a **Needs attendance** queue (past Sessions with zero attendance records — teacher/admin only, expanded by default), **Today** (single row, the page's only Figure Green accent, with the mark action), **Upcoming** (next few visible, rest behind disclosure), and **Recorded** (collapsed; each row shows its present-count and a Review action). A section-level summary line ("12 recorded · 3 need attendance") gives the close-runway verdict at a glance. For a Student the same section renders with no verdicts and no actions — upcoming/today/past only, since unrecorded-ness derives from roster attendance a Student's scope cannot see. We rejected a chronological timeline (buries the queue in date order, keeps 26 rows visible) and a mini month-calendar (the task is marking, not date-picking, and it duplicates the Calendar page).

Marking **navigates** to the existing `MarkSessionAttendancePage` (`/app/courses/:id/attendance/:date`); the inline `AttendanceMarkingSection` is deleted. One marking surface in the app: the dedicated page already owns the roster UX, bulk marking (ADR-0018), and the markability guard, and the two surfaces had already drifted. Do not reintroduce inline marking on the detail page.

Every verdict comes from an existing seam, nothing re-derived: `sessionsFor` for the list (ADR-0001); ADR-0034's single boundary predicate for past/today/upcoming; `closeReadiness(...).unrecordedSessions` for the queue — the same call the readiness checklist makes, so the two verdicts agree by construction; `resolveQueries` (ADR-0030) gates the section so a default-`[]` attendance window can never flash a false "needs attendance"; present-counts from the already-fetched attendance records.

## Consequences

- Sequenced after C2 (`resolveQueries` adoption on this page) and C6b (the ADR-0034 session-window primitives) land; the section consumes both.
- Deletes `AttendanceMarkingSection` (~100 lines), the page's duplicate session render, and the fourth session-window spelling. The dedicated marking page becomes the only marking surface.
- A11y: a labeled section, one named list per state group, state conveyed in row text (never color alone), actions named fully ("Mark attendance — Session 12, May 6"); disclosure is keyboard-native.
- New EN+ES keys: group headings (`needsAttendance`, `today`, `upcoming`, `recorded`), row summaries (`{present}/{total} present`, `0/{total} recorded`), actions (`markAttendance`, `review`), and the section summary. Orphaned Schedule/inline-marking keys are pruned so `i18n:check` stays green.
- Ranges: 8–30 Sessions typical; the Needs-attendance group must handle 0 (healthy) through all-past (neglected) without pagination.
- Restrained visual register per PRODUCT.md: mono ramp rows, Figure Green only on Today and the primary action.
