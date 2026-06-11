import { useStore } from '@/data/store'
import { can, type Action, type Resource, type PermissionContext } from '@/permissions'

/**
 * Hook to check if the current user can perform an action on a resource.
 * Automatically reads role and userId from the store and injects userId into context.
 * Re-renders when role changes.
 */
export function useCan(
  action: Action,
  resource: Resource,
  ctx?: Omit<PermissionContext, 'userId'>
): boolean {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)

  if (!role) {
    return false
  }

  const fullContext: PermissionContext = {
    ...ctx,
    userId: userId ?? undefined,
  }

  return can(role, action, resource, fullContext)
}
