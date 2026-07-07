# Class email extends the existing bulk campaigns, with a guardian audience and a teacher scope

_Accepted (design grilling 2026-07-07)._

"Email the class (students or parents)" does not need a new module: the bulk-email module already exists (admin-only `bulkEmail` resource, `resolveRecipients` over all/program/province/course filters, campaign history, `emailCampaign` audit entity, simulated send — nothing leaves the browser). We extend it along three axes instead of building a parallel course-mailer that would drift from it.

1. **Audience.** Campaigns gain `audience: 'students' | 'guardians' | 'both'`. `resolveRecipients` keeps resolving Students (the filter logic is unchanged) and a sibling step maps the resolved Students to recipient emails: their own, their Encargado's (every Student has exactly one, with a seeded email), or both. The recipient-count preview and history rows show the audience.
2. **Teacher scope.** The matrix `bulkEmail` rows open to teacher with scope `own`: `scopeFor('teacher')` already tokenizes ownership and `api` interprets it (ADR-0008), so a teacher's filter is locked to `kind: 'course'` over their own Courses, and their history list shows only their campaigns. The store's send mutation re-checks the Course ownership (ADR-0009) — the locked-down form is defense-in-depth, not the boundary.
3. **Entry point.** CoursesDetailPage gains a "Message the class" action (teacher-own/admin) that opens the compose flow with the course filter prefilled. The BulkEmailPage remains the admin's broad-audience surface and the shared history; the nav item stays admin-gated by the matrix for now — the teacher path enters through the Course.

Sends stay simulated: a campaign row (the outbox) plus an audit entry is the proof of send, and the compose dialog carries a one-line "demo — no email leaves the browser" note. We rejected `mailto:` generation (fake seeded addresses in a real mail client, unauditable) and a full fake-inbox module (a whole surface nobody can use).

## Consequences

- `EmailCampaign` gains `audience`; existing seeded/persisted campaigns lack it ⇒ ride the package STATE_KEY bump (ADR-0039) rather than defaulting in place (reseed, never migrate — ADR-0003).
- `resolveRecipients` stays student-typed and pure; a new pure `recipientEmails(students, audience)` beside it is the tested unit. History and preview counts count emails, not students, once `both` exists.
- Matrix change is additive (`teacher: { view: true, create: true }` + scope `own`); permission tests pin that student/tcu remain `none` and that a teacher cannot send to a Course they don't teach (store-level rejection test).
- The Course entry point reuses the campaign compose (one form component, two mounts) — no duplicated zod schema.
- i18n: audience labels + the demo note in EN/ES; the dynamic `bulkEmail.*` key families get their new members via `keys.ts` manifest lines (the TCU-status lesson).
