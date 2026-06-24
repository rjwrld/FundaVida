import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useStore, type StoreState } from '@/data/store'
import { AUDIT_LOG_KEY } from './auditLog'

// Names of the store slices that are mutation methods.
type StoreMethodName = {
  [K in keyof StoreState]: StoreState[K] extends (...args: never[]) => unknown ? K : never
}[keyof StoreState]

interface EntityMutationConfig<TVars> {
  /** Store mutation method to invoke. */
  method: StoreMethodName
  /** i18n key for the success toast. */
  toastKey: string
  /** Entity query keys to invalidate on success. */
  invalidates?: QueryKey[] | ((vars: TVars) => QueryKey[])
  /** Map mutation variables to the store method's positional args (defaults to `[vars]`). */
  args?: (vars: TVars) => unknown[]
}

export function makeEntityMutation<TVars = void>(config: EntityMutationConfig<TVars>) {
  return function useEntityMutation() {
    const client = useQueryClient()
    const method = useStore((s) => s[config.method]) as (...args: unknown[]) => unknown
    const { t } = useTranslation()
    return useMutation({
      mutationFn: async (vars: TVars) => method(...(config.args ? config.args(vars) : [vars])),
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
