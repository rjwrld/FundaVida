# Announcements are course-scoped, and session changes auto-post one

_Accepted (design grilling 2026-07-07)._

Teachers need a channel to the class — "Thursday's session moved", "bring your workbook" — and the dashboard redesign (ADR-0043) needs live content. A new stored entity **Announcement** `{ id, courseId, body, kind: 'manual' | 'sessionChange', createdAt }` is course-scoped: its audience is exactly the Course's roster. We rejected Sede/org-wide bulletins — a second audience model and a bigger permission surface than the demo warrants; bulk email (ADR-0041) already covers the broadcast case.

Writes go to the Course's own Teacher and admin through a new `announcements` matrix resource (create: teacher `own` + admin; ADR-0007). Reads ride the scope seam (ADR-0008): admin all, teacher own Courses, student enrolled Courses, TCU trainee the assigned Course (ADR-0036) — `scopeFor` returns the token, `api.announcements.list()` interprets it. No raw store reads from components (ADR-0012's discipline).

The most common announcement is a session change, so it is never typed twice: the session-exception mutations (ADR-0039) auto-post a `kind: 'sessionChange'` Announcement in the same store action, body derived from the exception (cancelled/moved + dates). Deleting is teacher-own/admin; there is no edit (post a correction — keeps the audit story simple). Every write audits (ADR-0005) under a new `announcement` entity.

Surfaces: a feed section on CoursesDetailPage (compose box for teacher/admin, list for everyone scoped) and the dashboard feeds (ADR-0043) showing the newest few across the viewer's scoped Courses. No read-state, no notification system — the demo has no push channel and the dashboard feed is the inbox.

## Consequences

- New persisted slice `announcements` — rides the same STATE_KEY bump as ADR-0039 (whichever data PR lands first takes it).
- Matrix gains the `announcements` resource with create/delete + view rows and scope tokens; nav does NOT gain an entry (the feed lives inside existing surfaces), so ADR-0010's derivation is untouched.
- `useAnnouncements` / `useCreateAnnouncement` hooks via `makeEntityMutation`; the mutation's `invalidates` list must include the dashboard-feed and course-detail query keys (the #87 cache-invalidation class).
- Seed posts a couple of manual announcements per active Course so feeds are never empty on first load.
- Tests: store permission rejections (student cannot post), scope reads per role (a student never sees another Course's feed), the auto-post on cancel/reschedule (one mutation ⇒ exception + announcement + two audit entries), and a first-paint gate on the dashboard feed (resolveQueries, ADR-0030).
