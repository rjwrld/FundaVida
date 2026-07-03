# Program visibility is per-role; every nav surface derives from the matrix

_Proposed (UX pass 2026-07-03). Supersedes ADR-0015 in part._

ADR-0015 made the Program catalog org-wide and viewable by every role. For a TCU Trainee that grant buys nothing: Trainees are not enrolled in Courses (CONTEXT.md), no tcu surface reads the catalog, and the nav item is one of only four the role sees — a quarter of the volunteer's navigation pointing at a page irrelevant to their work. The org-wide _scope_ stance stays; the _every role views it_ stance is dropped.

Two matrix cells change, and everything else derives (ADR-0010): `tcu.programs.view` becomes false — the nav item and the `/app/programs` route disappear for the role with no edits to `nav.ts` or `App.tsx` — and the tcu `programs` scope token goes `'all' → 'none'`, closing the read seam alongside the UI gate so no future tcu surface can accidentally list the catalog (`applyProgramsScope` already returns `[]` for any non-`all` token). For every other role the catalog is unchanged: org-wide, read-only, token `'all'`.

The same pass fixes the one nav surface that never derived: `CommandPalette` carried a hardcoded destination list (students, courses, certificates, bulk-email), so a TCU volunteer opening ⌘K was offered four routes `RoleGate` bounces. The palette now builds its navigation group from `navItemsForRole(role)` — the same derivation the sidebar (and the mobile drawer) use. One derivation, every surface; a role's reachable destinations are defined exactly once, in the matrix.

## Consequences

- ADR-0015's "viewable by every role" is superseded; its org-wide catalog semantics (token `'all'`, generic scope branch) survive for viewing roles. A future role wanting the catalog is one matrix cell, not a nav change.
- The TCU nav shrinks to Dashboard / Calendar / TCU — every item actionable for the role.
- `CommandPalette` can no longer drift from the matrix: an inaccessible destination in the palette is now structurally impossible, and a new resource added to `NAV_ITEMS` appears in the palette for exactly the roles that can view it.
- Tests: the permissions matrix test gains the flipped tcu cell; a palette test asserts a tcu user sees only their reachable destinations (and an admin still sees the full set).
