# Sede replaces headquarters; one Sede binds Course, Teacher, and Student

The former `Course.headquartersName` (three `'… HQ'` strings) becomes `sede`, a required enum on Course, Teacher, and Student valued Linda Vista / Hatillo / Alajuelita. The model term is `sede` — the foundation's own word, like `canton` — and the English UI label is "Campus". One invariant governs all three entities: a Course's Teacher must share the Course's Sede, and a Student may only enroll in Courses at their own Sede. A Student's Sede is therefore a stored home field, not derived from enrollments — derivation would leave a never-enrolled Student Sede-less, and the students table shows Sede in place of Province, an always-present column that must render before any enrollment exists. `province`/`canton` stay as address data. We rejected keeping headquarters as a separate concept (it only ever meant the teaching site) and deriving student Sede from courses (empty-case blank + multi-sede ambiguity).

## Consequences

- The Course create/edit form filters the Teacher picker to the Course's Sede; the enrollment seam rejects a Student↔Course Sede mismatch.
- The seed assigns one Sede per Teacher and Student and only wires enrollments within a Sede, so the existing coherent demo story holds.
- Sede is zod-enum-validated like the other constrained fields; adding a fourth sede is a one-line constant plus a locale key.

_Amended by ADR-0016 — Level joins Sede as a second hard, store-enforced enrollment invariant: a Student may enroll only in Courses whose level matches their educational level or is `'both'`._
