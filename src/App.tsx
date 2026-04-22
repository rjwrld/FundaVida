import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StudentsListPage } from '@/pages/StudentsListPage'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
import { StudentsFormPage } from '@/pages/StudentsFormPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoleRequired } from '@/components/demo/RoleRequired'
import { RoleGate } from '@/components/demo/RoleGate'

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route element={<RoleRequired />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route element={<RoleGate allow={['admin', 'teacher']} />}>
              <Route path="students" element={<StudentsListPage />} />
              <Route path="students/new" element={<StudentsFormPage />} />
              <Route path="students/:id" element={<StudentsDetailPage />} />
              <Route path="students/:id/edit" element={<StudentsFormPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
