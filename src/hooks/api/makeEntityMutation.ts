import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useStore, type StoreState } from '@/data/store'
import { writeSetInvalidations } from './invalidation'

// Names of the store slices that are mutation methods.
type MutationMethodName = {
  [K in keyof StoreState]: StoreState[K] extends (...args: never[]) => unknown ? K : never
}[keyof StoreState]

// Positional argument tuple of a given store mutation method.
type MethodArgs<K extends MutationMethodName> = StoreState[K] extends (...args: infer A) => unknown
  ? A
  : never

interface EntityMutationConfig<K extends MutationMethodName, TVars> {
  /** i18n key for the success toast. */
  toastKey: string
  /**
   * Map mutation variables to the store method's positional arguments. Omit when
   * the method takes the mutation variables as its only argument. The returned
   * tuple is checked against the method's parameter list, so a wrong arity is a
   * compile-time error.
   */
  args?: (vars: TVars) => MethodArgs<K>
}

/**
 * Factory for the entity mutation-hook template: call a store method, fire the
 * success/error toast, and invalidate the query keys the store call actually
 * wrote (ADR-0029). Invalidation is derived, not declared: `makeEntityMutation`
 * snapshots store state around the synchronous store call and hands the before/
 * after pair to `writeSetInvalidations`, so a hook can never drift from what its
 * mutation touched. The audit log is covered like any other slice — every
 * `withAudit` mutation writes it, so `['auditLog']` is always in the diff.
 *
 * Curried (`method` first, then config) so the method name fixes `K` before the
 * config is checked — that lets `args` be validated against the method's real
 * parameter tuple while the variables type stays explicit, which a single call
 * couldn't do (TypeScript requires all-or-nothing explicit type arguments).
 */
export function makeEntityMutation<K extends MutationMethodName>(method: K) {
  return function configureEntityMutation<TVars = MethodArgs<K>[0]>(
    config: EntityMutationConfig<K, TVars>
  ) {
    return function useEntityMutation() {
      const client = useQueryClient()
      const run = useStore((s) => s[method]) as (...args: unknown[]) => unknown
      const { t } = useTranslation()
      return useMutation({
        // Snapshot store state before the write. React Query pairs this context
        // with this call's onSuccess, so overlapping mutate() calls on one hook
        // instance can't cross wires the way a shared ref could.
        onMutate: () => ({ before: useStore.getState() }),
        mutationFn: async (vars: TVars) => {
          const callArgs = config.args ? config.args(vars) : [vars]
          return run(...callArgs)
        },
        onSuccess: (_data, _vars, context) => {
          toast.success(t(config.toastKey))
          // `run` is synchronous and done, so getState() is the post-write state;
          // diffing it against the pre-write snapshot yields this call's write-set.
          const invalidations = writeSetInvalidations(context.before, useStore.getState())
          for (const queryKey of invalidations) {
            client.invalidateQueries({ queryKey })
          }
        },
        onError: (error: unknown) => {
          toast.error(
            t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
          )
        },
      })
    }
  }
}
