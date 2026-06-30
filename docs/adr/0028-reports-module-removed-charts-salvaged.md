# The standalone Reports module is removed; its useful charts move into role-scoped surfaces

_Proposed (planning milestone "Certificate lifecycle rework + UI/UX overhaul")._

The admin-only Reports page (`/app/reports`) is a disconnected analytics dump: six charts (`EnrollmentTrendChart`, `AttendanceHeatmap`, `AverageGradeDonut`, `TcuProgressRing`, `TopCoursesBar`, a certs-this-month delta, an upcoming list) on one screen that drive no decision. It is removed rather than polished in place: the route, its nav item, and the `reports` permission resource — its `Resource` union member, every matrix cell, and its scope-map entry — are deleted, and routes and nav stay correct because they derive from the matrix (ADR-0010). The charts that earn their place are salvaged into the surfaces where they are contextual and actionable: the reworked dashboard cards (attendance snapshot, enrollment trend, certificates issued) and the detail pages (a course's attendance heatmap), each reading through the scope it already has.

We rejected repurposing Reports into a role-scoped "Insights" destination (the alternative considered): the demo gains more from analytics that sit next to the thing they describe than from a second analytics tab, and consolidating into the dashboard removes a route rather than adding upkeep. Salvage keeps the chart components — they are good; only their home was wrong.

## Consequences

- `reports` leaves the `Resource` union, the permission matrix, and the scope map; no role can `view` it, so the nav item and route disappear by derivation (ADR-0010) with no hardcoded list to prune.
- Salvaged charts are re-parented into dashboard cards and detail pages under the viewer's existing scope — no new permission and no `STATE_KEY` change.
- Orphaned i18n keys for the Reports page are removed so `i18n:check` stays green; chart components that no surface adopts are deleted rather than left dead.
