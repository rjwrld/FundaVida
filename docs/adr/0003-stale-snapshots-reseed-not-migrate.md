# Stale persisted snapshots are rejected and reseeded, not migrated

When the persisted localStorage snapshot fails shape validation — including Courses that predate Term and Meeting Days — `loadPersistedState` returns null and the app reseeds fresh at a new Demo Epoch. We chose this over in-place migration because the demo's persisted data has no real value to protect, while migration code would have to invent Terms for old Courses and then be maintained forever; rejection keeps `isValidSnapshot` the single gatekeeper.

## Consequences

- Every schema-shaping change to a persisted entity must extend `isValidSnapshot`, and ships as a one-time silent reset for returning visitors. Their edits (enrollments, grades, attendance changes) are discarded.
- This compounds ADR-0002's accepted drift: a returning visitor either keeps a consistent old epoch (valid snapshot) or gets a fresh one (invalid snapshot) — never a mix.
