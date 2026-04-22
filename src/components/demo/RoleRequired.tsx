import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/data/store'

export function RoleRequired() {
  const role = useStore((s) => s.role)
  if (!role) return <Navigate to="/" replace />
  return <Outlet />
}
