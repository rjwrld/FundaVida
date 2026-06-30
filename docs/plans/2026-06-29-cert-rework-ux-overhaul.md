# Plan — Certificate lifecycle rework + UI/UX overhaul

_Planning doc (2026-06-29). Companion ADR drafts: 0024–0028. Status: Proposed — no code lands from this doc; it defines the ADRs and the milestone of TDD-able issues._

_GitHub: [milestone #2 — Certificate lifecycle rework + UI/UX overhaul](https://github.com/rjwrld/FundaVida/milestone/2). Issue → number: 1 #146 · 2 #147 · 3 #148 · 4 #149 · 5 #150 · 6 #151 · 7 #152 · 8 #153 · 9 #154 · 10 #155 · 11 #156 · 12 #157._

## Goal

Two coupled improvements:

- **Part A** — replace the admin certificate-approval flow with a course-end ceremony: a Teacher/admin **closes** a Course, which emits every passing Student's Certificate as immediately downloadable. Remove the pending/approve machinery, and fix the grade↔certificate reconciliation gaps along the way.
- **Part B** — a UI/UX overhaul: redesign the Student and Course detail pages, paginate data tables, remove the Reports module (salvaging its charts), rework dashboard cards, and extend the existing motion seam.

Everything respects the data spine (store → api/scope → react-query hooks → permissions matrix), the Demo Epoch / reseed-never-migrate rules (ADR-0002/0003), EN+ES for every string, and the full CI gate set (`typecheck · lint · format:check · i18n:check · test · build · e2e`).

## Premise corrections (verified in code)

1. **"Zero animations" is inaccurate.** `framer-motion@^12.38.0` is a dependency; `src/lib/motion.ts` defines shared tokens; `main.tsx` wraps the app in `<MotionConfig reducedMotion="user">`; `index.css` honors `prefers-reduced-motion`. Dashboards, landing, and the certificates page already animate (`NumberTicker` exists). The gap is **coverage** — route transitions, list add/remove, toasts, progress motion. ADR-0027 extends the seam rather than introducing one.
2. **Reports is not a stub.** It renders six real chart components in `src/components/reports/`. The "slop" critique is that it is a disconnected analytics dump. Chosen direction: **remove and salvage** the charts into role-scoped dashboard cards / detail pages (ADR-0028).

## Real correctness bugs this milestone fixes

- `maybePendingCertificate` (`store.ts:227`) is append-only and bails if a cert exists → a grade downgrade below 70 leaves a stale/wrongly-valid cert. (ADR-0025, Issue 3.)
- `useUpdateGradeScore` invalidates only `['grades']`, not `['certificates']`/`['courses']` → post-edit cert staleness. (Issue 3.)
- `cert.score` and `cert.createdAt` snapshot accidentally at grade-save time → made intentional at emission. (ADR-0025, Issue 2/3.)
- `state.currentUserId ?? 'system'` in both approval paths and `makeAuditEntry` → approval paths deleted; the audit-seam fallback documented as defensive-only. (ADR-0025, Issue 2.)

## ADR map & reversals

| ADR      | Decision                                                                                                        | Reverses / supersedes                                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0024** | Closing a Course emits its Certificates; approval removed; `CourseStatus` gains `closed`; `close` matrix action | **Supersedes ADR-0019** (cert approval + pending-first worklist) and the **approve half of ADR-0022** (in-course Approve). Reverses the "admin approval KEPT" decision of the #140–142 overhaul. |
| **0025** | Certificates reconcile to the latest Grade; `score` snapshots at emission                                       | Supersedes the "passing Grade auto-mints a pending cert" behavior in CONTEXT.md and the ADR-0012-era store.                                                                                      |
| **0026** | Data tables paginate over the scoped list                                                                       | — (new)                                                                                                                                                                                          |
| **0027** | Motion coverage extends via the existing seam                                                                   | — (corrects the "zero animations" premise)                                                                                                                                                       |
| **0028** | Reports module removed; charts salvaged                                                                         | Retires Reports (no prior ADR governs it).                                                                                                                                                       |

On merge of the rework, add `_Superseded by ADR-0024_` to ADR-0019 and an approval-half note to ADR-0022, and rewrite the CONTEXT.md _Certificate_ definition away from pending/approved vocabulary (tracked in Issue 2's AC).

## Milestone — ordered, one PR per concern

Global to every issue (not repeated): EN+ES keys with a `keys.ts` manifest line; full CI gate set incl. e2e; TDD red→green; e2e seeded via one-time `page.evaluate` with anchors derived from `seedDemo()`; reads through the scope seam, never raw store. Only **Issue 2** bumps `STATE_KEY`.

### Wave 1 — Certificate lifecycle (data spine; strictly first; ordered)

**1 — Course `closed` status + `closeCourse` action (no cert behavior yet).** `blocker, foundation, data`

- `CourseStatus` gains `'closed'`; `isValidSnapshot` accepts it (old `draft`/`published` snapshots stay valid → **no STATE_KEY bump**).
- Matrix `close` action: admin `true`, teacher `courseOwned`; add `'close'` to `AuditAction`.
- Store `closeCourse(courseId)`: `assertCan`, throw unless `status === 'published'`, set `closed`, audit through `withAudit`.
- `useCloseCourse` invalidates `['courses']` + course detail key.
- UI: "Close course" / "Cerrar curso" button on `CoursesDetailPage`, guarded by `can('close','courses',{course})` + confirm dialog.
- **AC:** teacher closes own published course → `closed`; admin closes any; non-owner teacher denied (store throws); closing a `draft` or already-`closed` course throws; audit entry recorded; button renders only when permitted. Tests: store perms, guard, button gating, e2e close flow.

**2 — Closing emits Certificates; rework Certificate model; remove approval. `STATE_KEY v9 → v10`.** `blocker, data` _(depends on 1)_

- Types: `Certificate` drops `status`/`approvedAt`/`approvedBy`; `createdAt → issuedAt`; delete `CertificateStatus`. Rewrite CONTEXT.md _Certificate_ def; add supersession notes to ADR-0019/0022.
- `lib/certificates.ts`: `isCertificateDownloadable` → existence-based; add pure `emitCertificatesForClose(course, enrollments, grades)`.
- Store: `closeCourse` also emits one downloadable cert per enrolled passing (≥70) Student (score snapshot, `issuedAt = now`) in the same `withAudit`; delete `approveCertificate`/`approveCertificates`; remove `maybePendingCertificate` from `setGrade`.
- Matrix: delete `certificates: { approve }` cells (admin + teacher); keep the `approve` action (still used by enrollments/tcu).
- `api/certificates.ts`: drop `status` from `CertificateFilters` and its filter branch.
- Hooks: delete `useApproveCertificate(s)`; `useCloseCourse` now also invalidates `['certificates']`, `['students']`. Remove approval toast keys.
- Seed: completed cohorts → `status: 'closed'` + downloadable certs (`issuedAt ≈ grade.issuedAt + days`, capped at epoch, `score = grade.score`); drop pending/approved/persona-pending logic.
- Persistence: `STATE_KEY = v10`; `v9` → legacy list; `isValidSnapshot` updated for the new Certificate shape.
- UI: `CertificatesListPage` → scoped gallery (no tabs / Approve / Approve-all); `CourseCertificatesSection` → list-only.
- **AC:** closing emits exactly one downloadable cert per passing enrolled Student, none for failing/ungraded; no pending state anywhere; `approveCertificate(s)` gone from store+hooks+matrix; cert PDF downloadable immediately post-close; reseed verified (v10; v9 rejected); EN+ES. Tests: emit logic, perms, no-approve UI, reseed; **e2e** close → student downloads cert.
- **Note:** assumes the `v9` baseline (`feat/spanish-tcu-titles`) is merged to `main` first, so the bump is v9→v10.

**3 — Grade↔Certificate reconciliation + score snapshot (ADR-0025).** `data` _(depends on 2)_

- `reconcileCertificate` replaces `maybePendingCertificate`; `setGrade` + `updateGradeScore` both reconcile.
- Pre-close: grade edits touch no certs. Post-close: `<70` revokes the cert, `≥70` (re)issues with a fresh score snapshot.
- Matrix: teacher grade `enter`/`edit` gated `courseOwned` + Term-passed + `status === 'published'` (locked after close); admin unconditional → reconciles.
- `useUpdateGradeScore` invalidates `['certificates']` + `['courses']` (today only `['grades']`).
- **AC:** post-close downgrade removes the cert; post-close upgrade (re)issues with snapshotted score; pre-close edits no-op on certs; teacher cannot edit a closed course's grades (throws), admin can; updateGradeScore invalidations correct. Tests per branch; **e2e** close → admin lowers grade → cert revoked.

**4 — Remove admin approval dashboard surfaces.** `dashboard` _(depends on 2)_

- Remove `PendingApprovals` card; remove WelcomeBanner pending count; remove any approval notification; drop the `useDashboardStats` pending field; remove orphan i18n keys + dead components/tests.
- **AC:** no "Pendientes de aprobación" UI anywhere; `i18n:check` clean; `grep` shows no `approveCertificate` refs; dashboard tests updated.

### Wave 2 — UI/UX structural (after Wave 1; 5 and 8 can start in parallel)

**5 — Paginated table primitive (ADR-0026).** `foundation` _(independent)_

- `DataTable` / `usePagination` over `ui/table.tsx`: client-side page nav + page-size, optional column sort, existing filters, mobile card-stack preserved, a11y ("page X of Y", keyboard), single empty state.
- **AC:** page nav/size/boundary states, sort toggle, empty state, reduced-motion-safe; no data-layer change; EN+ES for controls.

**6 — Adopt pagination on the big lists.** `ux` _(depends on 5)_

- Wire `DataTable` into Students, Courses, Grades, Enrollments (within groups), Attendance, Audit Log, Certificates.
- **AC:** each list paginates; scoped reads unchanged; **e2e** asserts page-size cap. _(splittable per-list)_

**7 — Student detail page redesign (ADR-0012).** `ux` _(depends on 2)_

- Replace the 3 cards (`StudentsDetailPage.tsx`) with a profile: header (name, Sede, level, guardian) + enrollments with per-course progress (attendance %, grade shown **green ≥70 immediately**, cert state) + certificates (downloadable only post-close) + contact. Optional stretch: apply the same pattern to `TeachersDetailPage` for parity.
- **AC:** sections render from scoped hooks; student self-only (e2e), admin/teacher full per scope; passing grade shows green with no wait; cert appears only after the course closes. Component + e2e; EN+ES.

**8 — Course detail: schedule + consistent roster (ADR-0001/0011).** `ux, enrollment` _(depends on 1 for the closed badge; else independent)_

- Add a Schedule section (derived Sessions via `sessionsFor`/`lib/sessions.ts`, ordinals + dates) and a Volunteers (TCU trainees) section; ensure teacher(s)/students/volunteers shown are Sede-consistent (ADR-0011); show the `closed` badge.
- **AC:** schedule lists derived Sessions for the Term × Meeting Days; volunteers shown; all roster entities share the Course's Sede; closed badge renders. Component + e2e; EN+ES.

**9 — Remove Reports; salvage charts (ADR-0028).** `ux, dashboard` _(charts feed Issue 10)_

- Delete `/app/reports` route + nav + the `reports` resource (union, matrix, scope map); relocate the worthwhile charts (attendance heatmap, enrollment trend, certificates-issued) into dashboard cards (Issue 10) / detail pages; delete unused chart components; remove orphan i18n keys.
- **AC:** no `/app/reports` route or nav; `reports` gone from `Resource`/matrix/scope; salvaged charts re-parented under existing scope (no new permission); `i18n:check` clean; tests updated.

### Wave 3 — Dashboard + motion

**10 — Dashboard cards rework (Part B6).** `dashboard` _(depends on 2, 4, 9)_

- Replace `TopCourses` / `RecentActivity` (and the removed approval card) with role-scoped, actionable cards: Admin — "Courses to close" (Term-passed, `published`, awaiting grades), "Certificates issued this epoch", "At-risk students" (low attendance / failing), "Enrollment funnel by Sede"; Teacher — evolve "Ended Courses" → "Courses to close". Reuse salvaged charts.
- **AC:** new cards read scoped hooks (no raw store); links are actionable; the certs card uses the new model; EN+ES; tests.

**11 — Motion coverage: routes + lists + toasts (ADR-0027).** `motion` _(after Wave 1)_

- Extend `lib/motion.ts` usage: route/page transitions (`AnimatePresence` on the route outlet), list add/remove in tables/rosters, toast enter/exit, progress/number motion on dashboards/profiles (`NumberTicker`).
- **AC:** route changes, list mutations, and toasts animate; all reuse the tokens; reduced-motion disables them (asserted); no layout shift. _(splittable: 11a routes, 11b lists/toasts, 11c progress)_

### Wave 4 — Broader polish

**12 — UX polish pass.** `ux` _(splittable)_

- Empty states on every scoped list; skeleton consistency; dark-mode + responsive audit; a11y (dialog focus-trap, focus rings, contrast, form errors); `shortCourseName` usage consistency. Flag anything else found.
- **AC:** each scoped list has an empty state; a11y checks pass on dialogs/forms; dark mode consistent; no raw store reads introduced.

## Sequencing & STATE_KEY

- **Critical path:** 1 → 2 → 3, with **4** immediately after **2**. Cert-touching UI (7, 10) waits for **2**.
- **One STATE_KEY bump: v9 → v10, in Issue 2.** No other issue changes persisted shape. Issue 1 widens the `status` union forward-compatibly (no reseed). Issue 2 assumes `feat/spanish-tcu-titles` (v9) is merged to `main` first.
- **Parallelizable early:** 5 (pure primitive) and 8 (needs only Issue 1's badge) can run alongside the Wave 1 tail. 11 (motion) can run anytime after Wave 1.
- **9 gates 10** (the dashboard salvages Reports' charts).

## Post-merge follow-ups

- Add supersession italics to ADR-0019 / ADR-0022; rewrite CONTEXT.md _Certificate_.
- Update memory `project_courses_certs_enrollments_overhaul` (records "admin approval KEPT" — now reversed).
