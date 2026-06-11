# Permissions are one declarative matrix module

All role capabilities live in a single declarative table in `src/permissions/`, exposed only through `can(role, action, resource, context?)` and `scopeFor(role)`. The action vocabulary is CRUD (`view`/`create`/`edit`/`delete`) plus the domain verbs the approved matrix names (`approve` certificates, `mark` attendance, `log` tcu, `enter` grades), so the code table reads 1:1 against the issue #65 matrix. Matrix cells are booleans or context predicates (e.g. teacher may `enter` grades only when `course.teacherId === userId && course.status === 'ended'`); conditions live in the cell, never at call sites. We chose one table over scattered checks (the ~30 inline `role === '…'` comparisons this replaces) and over per-layer permission helpers (which re-scatter the matrix by consumer).

## Consequences

- Capabilities whose UI lands in later slices (certificate approval, attendance marking, TCU logging) already have rows; wiring the UI never edits the matrix.
- The exhaustive role × action × resource unit test pins every cell; a matrix change fails a test by construction.
- Routes, nav, API filters, page buttons, and store mutations are consumers only — none may encode a role check the module doesn't express.
