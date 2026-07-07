/**
 * The single home for multi-query loading verdicts (ADR-0030).
 *
 * A page that derives a render decision from two or more React Query hooks must
 * hold that decision until every one of them has loaded; reading a hook's
 * default-`[]` window before it resolves computes a false verdict that flashes.
 * `resolveQueries` owns that loading guard so no page hand-rolls an OR-chain
 * (and none forgets a query, widening its data-dependency set past its gate).
 */

/**
 * The structural shape `resolveQueries` reads from a query result — a subset of
 * React Query's `UseQueryResult`, so the seam is decoupled from React Query's
 * types and trivially faked in tests.
 */
export interface QueryLike<D> {
  isLoading: boolean
  data: D | undefined
}

type ResolvedTuple<T extends readonly QueryLike<unknown>[]> = {
  [K in keyof T]: T[K] extends QueryLike<infer D> ? D : never
}

type ResolveResult<T extends readonly QueryLike<unknown>[]> =
  | { isPending: true; data: undefined }
  | { isPending: false; data: ResolvedTuple<T> }

/**
 * Gate a render decision on a set of query results.
 *
 * Gates on each input's `isLoading` — NOT `isPending`: a conditionally-disabled
 * query (`enabled: false`) sits at `status: 'pending'` forever, so gating on
 * `isPending` would hang the gate on an infinite skeleton. Load-bearing; do not
 * "simplify" to `isPending`.
 *
 * `data` is `undefined` until every input clears `isLoading`, then a positional
 * tuple with non-undefined elements. There is no `[]` default, so a caller
 * cannot read a half-loaded value: the `isPending` guard must be cleared before
 * `data` narrows from `undefined` to the tuple. Under-specifying a render's data
 * dependencies becomes a type error rather than a flash.
 *
 * No `isError` state (documented assumption, ADR-0030): the fake-async list api
 * has no throw path. If real errors become reachable, extend the return then.
 */
export function resolveQueries<T extends readonly QueryLike<unknown>[]>(
  results: readonly [...T]
): ResolveResult<T> {
  if (results.some((r) => r.isLoading)) {
    return { isPending: true, data: undefined }
  }
  return { isPending: false, data: results.map((r) => r.data) as ResolvedTuple<T> }
}
