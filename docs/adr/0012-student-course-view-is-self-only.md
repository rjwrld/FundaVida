# A Student's Course view shows only the Student's own records

A Student opening one of their Courses sees Course metadata plus only their own Attendance and Grade — never the enrollment roster or other students' records. Today `CoursesDetailPage` reads `enrollments` straight from the store and renders every classmate, bypassing the scope that already filters the Courses list (ADR-0007). The detail page must derive its roster and records through the same scope as the list: for a Student, the "roster" collapses to self. Direct URL navigation to a Course the Student is not enrolled in is denied, not merely unlinked. We chose scoping the detail reads over hiding the roster inside the component, because a component that reads raw store collections for a scoped resource just re-opens the same leak on the next screen.

## Consequences

- Components rendering a scoped resource read it through the API/scope seam, never `useStore((s) => s.<collection>)` directly.
- The Course detail page branches by role: admin and the Course's Teacher see the roster; a Student sees only self.
- A Student hitting `/courses/:id` for a Course they are not enrolled in takes the not-authorized / not-found path.

_Amended by ADR-0016 — a non-enrolled Student may now view a browseable Course's detail (one open for enrollment at their Sede and Level), with the roster still hidden: a third path beside the enrolled-self-view and the not-found denial._
