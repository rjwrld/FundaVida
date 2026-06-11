import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/data/store'
import { can } from '@/permissions'
import type { Action, Resource } from '@/permissions'

export function RoleGate({ resource, action = 'view' }: { resource: Resource; action?: Action }) {
  const role = useStore((s) => s.role)
  if (!role || !can(role, action, resource)) return <Navigate to="/app" replace />
  return <Outlet />
}
