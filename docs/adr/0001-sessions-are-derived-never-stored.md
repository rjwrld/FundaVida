# Sessions are derived from Term × Meeting Days, never stored

A Course's Sessions (individual class meetings) are computed by a pure function from the Course's Term and Meeting Days — there is no session table or stored session list. Attendance records reference a Session by its date. We chose this over an explicit session list because one small interface (`sessionsFor(course, range)`) then serves the calendar, the attendance roster, the dashboard, and the seed generator, and the seed can't drift out of sync with a stored list.

## Consequences

- Per-session exceptions (holidays, cancelled classes, rescheduled meetings) are out of scope by design. If they're ever needed, this decision must be revisited — don't bolt exception flags onto attendance records.
- An attendance record's validity (does its date land on a real Session inside the Term?) is checkable against the derivation, and should be.
