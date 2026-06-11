# Store mutations throw on permission violation before the withAudit recipe runs

Every store mutation checks `can()` for the current role first and throws on violation, before its `withAudit` recipe executes — so a denied mutation changes no state and emits no audit entry (consistent with ADR 0005: a throw before `set` produces no entry). Enforcement lives in the store, not only in the UI: hiding a button is presentation; the store is the boundary that guarantees e.g. a teacher cannot create a student. We chose throwing over silent no-ops (callers must observe denial; the existing hook layer already catches and toasts thrown errors) and over enforcing only at the hook layer (direct store calls would bypass it).

## Consequences

- UI layers (routes, nav, buttons) become redundant guards — defense in depth, not the enforcement point.
- Denial messages follow the existing convention for defensive guards: English strings surfaced through the hooks' `t('toasts.error', { message })` path.
- Tests can assert enforcement by calling mutations directly under a non-privileged role.
