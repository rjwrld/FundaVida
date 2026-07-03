# The scope seam accepts a ScopeContext instead of reaching the global store

_Proposed (architecture review 2026-07-03). Deepens ADR-0008; does not change the token contract._

`applyScope` and its per-resource functions are the one genuinely deep module in the data spine — 367 lines of ADR-cited scope rules behind a four-argument call — but they reached the global store from inside: `applyScope` read `useStore.getState()` for `currentUserId`, and each per-resource function (`applyStudentsScope`, `applyEnrollmentsScope`, `applyGradesScope`, `applyCertificatesScope`, `applyAttendanceScope`, `applyTcuScope`, `applyTraineesScope`) reached `getState()` again for other slices. So the global singleton was touched three times per scoped read across three files, and "what data can this function see" was invisible from its signature. Tests paid for it: every scope assertion did `resetDemo` → `setRole` → mutate store slices before calling `applyScope`.

The seam now accepts its data as a parameter: `applyScope(resource, token, items, ctx)`, where `ctx: ScopeContext = { currentUserId, courses, enrollments, students, tcuTrainees }` — the exact five things the scope rules read, traced across every branch. `StoreState` structurally satisfies `ScopeContext`, so the ten api callers pass `state` unchanged; production is zero-friction. `userId` comes from `ctx.currentUserId`, not a separate argument — the identity is part of the context the rules read. The module no longer knows the store exists.

The `new Set(courses.filter(c => c.teacherId === userId).map(c => c.id))` idiom, rebuilt verbatim in six functions, becomes one pure `ownCourseIds(courses, userId): Set<string>` — narrowest dependency, directly testable. The concept it names is the pivot of all Teacher scope, so **Owned Courses** is added to `CONTEXT.md`: the Courses a Teacher teaches, the unit by which they see rosters, Grades, Attendance, Certificates, and assigned Trainees.

Separately, `CalendarPage` was the one page importing `applyScope`/`scopeFor` directly, reading raw `store.courses` and re-implementing the scoped-courses plumbing every other page gets from a hook. It routes through `useCourses()` instead — the same Courses scope, through the same seam, honouring ADR-0013 (the calendar rides the Courses scope, no calendar-specific permission) — gaining a loading state and C1's invalidation as a side effect. The scope seam stops leaking into the page layer.

## Consequences

- `applyScope`'s dependency set is declared in its signature; the global store is reached zero times inside the scope module.
- `scope.test.ts` migrates to pure `ScopeContext` literals — a scenario is a small hand-built object, not a `resetDemo`/`setRole`/store-mutation sequence — and `ownCourseIds` gets a direct unit test. The leak-removal is a net deletion of test boilerplate; the `applyScope` call in `enrollmentRequests.test.ts` passes a `ctx`.
- End-to-end scoping (`scopeFor` + `applyScope` + slice) is covered by Candidate 3's api-surface tests, so `scope.test.ts` stays pure scope-rule units — a clean split.
- Candidate 3 sequences after this: `scopedList` calls the four-argument `applyScope(resource, token, items, ctx)`. Candidate 1 is unaffected (write side).
- Pre-existing and unchanged: this deepens ADR-0008's interpreter without touching its contract — `scopeFor` still returns tokens, the api still interprets them; the interpreter simply no longer creates its own dependencies.
