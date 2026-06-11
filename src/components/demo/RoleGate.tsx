import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/data/store'
import { can } from '@/permissions'
import type { Resource } from '@/permissions'

export function RoleGate({ resource }: { resource: Resource }) {
  const role = useStore((s) => s.role)
  if (!role || !can(role, 'view', resource)) return <Navigate to="/app" replace />
  return <Outlet />
}
