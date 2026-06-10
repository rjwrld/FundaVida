# Audit entries are emitted by the store's withAudit seam

Store mutations never construct or prepend audit entries themselves. A mutation that must be audited routes its state change through `withAudit(set, recipe)`, where the recipe returns the entity-state delta plus an audit descriptor (`action`, `entity`, `entityId`, `summary`); the seam alone builds the entry — id, actor from `currentUserId` (falling back to `'system'`), ISO timestamp — and prepends it to `auditLog` inside the same `set` call, so the entity change and its audit entry stay atomic and a mutation that throws before `set` produces no entry. We chose a descriptor-recipe wrapper over a `set`-intercepting Zustand middleware (payload tagging, weaker typing) and over an action-dispatch table (a full rewrite for 15 mutations). Summaries remain human-written per-mutation data in the descriptor: declaring _what_ happened is data, constructing the entry is the seam's job.

## Consequences

- New write surfaces (certificate approval, attendance marking, TCU logging) are audit-complete by construction: route through `withAudit`, done.
- `setRole`, `setLocale`, and `resetDemo` stay outside the seam and unaudited by design.
- Seed audit entries remain pre-baked fixtures (`src/data/seed/auditLog.ts`) that never pass through the seam — they are historical scenery, not mutations.
- The persisted `AuditLogEntry` shape is unchanged, so existing snapshots stay valid (no ADR-0003 reseed).
