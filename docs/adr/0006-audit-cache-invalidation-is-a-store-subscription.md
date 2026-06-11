# Audit cache invalidation is a store subscription

The `['auditLog']` React Query cache is invalidated in exactly one place: a store subscription (`wireAuditInvalidation(queryClient)`) that watches the `auditLog` slice for reference changes and invalidates the key, wired once at app start in `main.tsx`. Mutation hooks never invalidate audit keys. We chose subscribing to the source of truth over a global `MutationCache.onSuccess` (fires for every mutation whether or not it audited, and couples invalidation to React Query plumbing) and over a shared per-hook helper (still N call sites, weakest collapse).

## Consequences

- Any mutation that appends an audit entry — present or future, hook-driven or not — invalidates the audit cache by construction; forgetting is impossible.
- Tests exercising mutation hooks with their own `QueryClient` do not get audit invalidation unless they call `wireAuditInvalidation` themselves; none currently assert it.
- The subscription must be torn down only at app teardown; it is intentionally global, like the store it watches.
