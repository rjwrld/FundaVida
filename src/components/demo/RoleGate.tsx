import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/data/store'
import type { Role } from '@/types'

export function RoleGate({ allow }: { allow: Role[] }) {
  const role = useStore((s) => s.role)
  if (!role || !allow.includes(role)) return <Navigate to="/app" replace />
  return <Outlet />
}
