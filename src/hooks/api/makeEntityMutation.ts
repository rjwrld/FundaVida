import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useStore, type StoreState } from '@/data/store'
import { AUDIT_LOG_KEY } from './auditLog'

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
  /** Entity query keys to invalidate on success (the audit key is always invalidated too). */
  invalidates?: QueryKey[] | ((vars: TVars) => QueryKey[])
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
 * success/error toast, and invalidate the entity query keys plus the audit log.
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
        mutationFn: async (vars: TVars) => {
          const callArgs = config.args ? config.args(vars) : [vars]
          return run(...callArgs)
        },
        onSuccess: (_data, vars) => {
          toast.success(t(config.toastKey))
          const keys =
            typeof config.invalidates === 'function' ? config.invalidates(vars) : config.invalidates
          for (const queryKey of keys ?? []) {
            client.invalidateQueries({ queryKey })
          }
          // Every store mutation appends an audit entry, so the audit log always refreshes.
          client.invalidateQueries({ queryKey: AUDIT_LOG_KEY })
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
