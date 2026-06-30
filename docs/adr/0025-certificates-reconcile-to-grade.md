# Certificates reconcile to the latest Grade; the score snapshots at emission

_Proposed (planning milestone "Certificate lifecycle rework + UI/UX overhaul"). Builds on ADR-0024._

A Certificate is kept reconciled with the Grade that earned it, never left stale. Before a Course is closed no Certificate exists (ADR-0024), so a Grade edit touches no Certificate. Once the Course is closed, editing a Grade re-reconciles that `(student, course)` pair: a score that drops below 70 **revokes** the Certificate — it is removed, because a no-longer-earned credential must not survive as downloadable — and a score at or above 70 **(re)issues** one. This replaces the append-only `maybePendingCertificate`, which only ever grew the list and bailed when a Certificate already existed, so a downgrade left a stale or wrongly-valid Certificate; the new `reconcileCertificate` helper is idempotent and converges on the current Grade.

`cert.score` is an intentional **snapshot at emission** — the Grade as it stood when the Course was closed, or when a post-close reconciliation re-issued the Certificate — not a live mirror of the Grade, because a credential records the result at the moment it was conferred. Grade entry and edit are gated so the two roles differ: a Teacher may enter/edit Grades only for an owned Course whose Term has passed and that is still `published` (a Teacher cannot alter a closed cohort), while an admin edits unconditionally so corrections remain possible — and an admin's post-close edit flows through the same reconciliation.

## Consequences

- `setGrade` and `updateGradeScore` both call `reconcileCertificate`; `useUpdateGradeScore` now invalidates `['certificates']` and `['courses']` in addition to `['grades']` — today it invalidates only `['grades']`, the staleness gap this closes (a post-close correction would otherwise leave the worklist/profile reading a revoked Certificate).
- The teacher grade predicate narrows from `courseOwnedAndEnded` to "owned + Term-passed + `published`"; the admin path stays unconditional, so the demo can still demonstrate a correction revoking a Certificate.
- Removing approval makes the `currentUserId ?? 'system'` fallback in the old approval path moot. The remaining fallback in `makeAuditEntry` is documented as defensive only: every set role maps to a concrete `currentUserId` via `userIdForRole`, and `assertCan` throws when no role is set (ADR-0009), so no in-app mutation — `closeCourse` included — attributes an action to `'system'` in practice.
