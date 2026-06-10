# Toast Feedback — Design

> Closes out Phase 8's undeveloped sonner work as a feature (mount + wiring). Styling
> stays stock — the in-flight blueprint-skin re-skin repaints via tokens later. Spec
> §5.1's flame-color variants are explicitly superseded.

**Decisions (2026-06-09):**

- **Scope: every mutation toasts.** All `useMutation` hooks get `onSuccess` success
  toasts; all get `onError` error toasts. Demo reset included.
- **Mount: App root.** One `<Toaster>` in `App.tsx` via an `AppToaster` wrapper that
  syncs sonner's `theme` to `useTheme`'s resolved value.
- **Styling: stock sonner + theme sync.** No variant colors now (blueprint-skin owns
  the palette).
- **Wiring: centralized in `src/hooks/api/*` mutation hooks.** Copy via `toasts.*`
  i18n keys (EN + ES, enforced by `i18n:check`); components unchanged.

**Slices** (branch `feat/toast-feedback`, one PR):

| slice           | files                                                                                           | depends on  |
| --------------- | ----------------------------------------------------------------------------------------------- | ----------- |
| toast-infra     | `App.tsx`, `AppToaster.tsx` (new), `locales/{en,es}.json` (ALL `toasts.*` keys land here), test | —           |
| toast-people    | `hooks/api/students.ts`, `teachers.ts`, tests                                                   | toast-infra |
| toast-academics | `hooks/api/courses.ts`, `grades.ts`, `enrollments.ts`, tests                                    | toast-infra |
| toast-comms     | `hooks/api/emailCampaigns.ts`, demo-reset call site, tests                                      | toast-infra |

toast-people ‖ toast-academics ‖ toast-comms are file-disjoint (locale keys all land in
toast-infra) and dispatch in parallel.

**Tests:** mock `sonner`, render hooks with a QueryClient wrapper, assert
`toast.success`/`toast.error` called with the translated copy; error paths force store
throws (e.g. `enrollStudent` unknown-id guard).

**Out of scope:** toast variant colors, no-FOUT script (separate run), the 6
blueprint-skin WIP files.
