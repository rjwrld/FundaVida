# Routes and nav derive allowed roles from the permissions module

Route guards (`RoleGate`) and sidebar nav items no longer carry hand-maintained `roles: Role[]` lists; both derive visibility from the permissions module (a route/nav entry names the resource it fronts, and allowed roles are computed via `can(role, 'view', resource)`). This kills the documented divergence risk where `App.tsx` hardcoded `allow={['admin','teacher']}` while `nav.ts` independently declared the same roles. We chose deriving from the matrix over making nav config the source of truth (nav is presentation; permissions are policy) and over keeping both lists with a consistency test (still two lists).

## Consequences

- A matrix change re-scopes routes and nav together, atomically.
- Nav/route entries gain a `resource` key; the `roles` arrays disappear.
- Pages reachable by deep link and their nav entries can no longer disagree.
