# The seed emits Certificates by the app's rule; the Session window has one home

_Proposed (architecture review 2026-07-03). Governed by ADR-0024/0025 (certificates) and ADR-0001 (derived Sessions)._

Two latent divergences where a rule was expressed in more than one place and the risk lived in the callers, which pure-helper unit tests cannot catch. Two independent PRs.

## Certificates: the seed reuses the app's emission rule

`emitCertificatesForClose(course, enrollments, grades)` emits one Certificate per Student with an **approved** Enrollment and a passing Grade (ADR-0024). The seed's `buildCertificates` reimplemented "passing Grade in a closed Course → Certificate" without the approved filter — and it is live, not hypothetical: the seed makes ~15% of Enrollments pending/rejected/withdrawn, `buildGrades` grades every Enrollment whose Term ended regardless of status, so the demo currently shows Certificates for withdrawn and rejected Students — a visible contradiction of ADR-0024 and CONTEXT.md ("a Certificate exists iff its Course was closed").

The seed threads `enrollments` into `buildCertificates` and emits through the shared rule: `[...closedCourseIds].flatMap(id => emitCertificatesForClose({ id }, enrollments, grades))`. The rule (who + score) is shared; the id and `issuedAt` stay caller-specific — the seed looks up each seed's Grade by `(studentId, courseId)` for its Term-relative `issuedAt` (Grade issued + 1–7 days, capped at the epoch) and assigns `cert-${i+1}` after the existing deterministic sort, exactly as `closeCourse` stamps the close instant. Seed and app now emit by construction from one rule.

This is the only behavior change in the review: Certificates for non-approved Enrollments disappear (correct), the seeded Certificate count drops, and the faker RNG shifts for anything seeded after `buildCertificates`. Per the established pattern, e2e and unit anchors that count Certificates are re-derived from `seedDemo()`, not hand-patched. It is not a `STATE_KEY` change — it is seed content, and stale snapshots reseed anyway (ADR-0003).

## Sessions: one boundary predicate, one upcoming derivation

"Is this Session past or upcoming" was spelled three ways — `date <= clock.today()` (markability), `!(date > clock.now())` (closeReadiness), `!isBefore(clock.now(), date)` (dashboards). For date-only Sessions (ADR-0001) these already agree — Session dates are midnight and `clock.now()` is always ≥ `startOfDay(today)` — so this is consolidation and future-proofing, not a bug fix: it stops a later one-operator edit from silently diverging. A single date-granularity boundary in `sessions.ts` — a Session is past/recordable iff `date <= today`, upcoming iff `date > today` — is adopted by all three sites (switching closeReadiness and the dashboards from `now()` to `today()` is a no-op for midnight-dated Sessions). The `flatMap(sessionsFor) → filter → sort` "upcoming Sessions across Courses" logic, copied in `StudentDashboard.getNextClass` and `NextSessionsList.getUpcomingSessions`, becomes one `upcomingSessions(courses, today, limit?)` in `sessions.ts` (the existing deep module). `findSession` (date lookup) and the day-scoped `useDaySessions` are related but already have homes and are left alone.

No `CONTEXT.md` term is added — Session and Certificate are already defined; this changes no vocabulary, only where the rules live.

## Consequences

- Seed and app emit Certificates from `emitCertificatesForClose`; a Certificate for a non-approved Enrollment can no longer appear anywhere. A seed-invariant test asserts every seeded Certificate corresponds to an approved, passing Enrollment; Certificate-count anchors are re-derived from `seedDemo()`.
- The Session boundary and `upcomingSessions` are tested at the boundary (yesterday past, today recordable, tomorrow upcoming) so markability, close-readiness, and the dashboards provably agree; `upcomingSessions` is tested for ordering, limit, and past-exclusion.
- The Session half changes no runtime behavior for date-only Sessions; it is shipped as consolidation, separately from the Certificate fix.
- Both are pure `src/lib/` changes with no permission, scope, or persistence impact; independent of the other five candidates.
