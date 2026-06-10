# Course scheduling contract: weekday literals, ordinal Sessions, local-midnight ISO dates

A Course's Meeting Days are an array of weekday literals (`'mon'…'sun'`), its Term is `{ start, end }` ISO strings, and a derived Session is `{ courseId, date, ordinal }` where `date` is a full ISO timestamp anchored at local midnight and `ordinal` is the 1-based position within the Course's session list. We chose literals over day numbers/bitmasks for readable persisted JSON and direct i18n mapping, and full ISO timestamps over bare `yyyy-MM-dd` because the app formats dates with `new Date(iso)`, which parses date-only strings as UTC midnight and renders them a day early in UTC-6.

## Consequences

- All session math converts literals to JS day numbers in one place (the sessions module); nothing else may re-derive weekday numbering.
- Attendance records keep `sessionDate` as stored ISO strings and bind to a Session by same-day comparison, never string equality — so the ordinal is recoverable without storing it (per ADR-0001).
- UI may label "Session 5" directly from the derived ordinal; any per-session metadata beyond date and ordinal would force revisiting ADR-0001, not extending this shape.
