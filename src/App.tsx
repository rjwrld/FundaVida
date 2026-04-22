import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StudentsListPage } from '@/pages/StudentsListPage'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
import { StudentsFormPage } from '@/pages/StudentsFormPage'
import { TeachersListPage } from '@/pages/TeachersListPage'
import { TeachersDetailPage } from '@/pages/TeachersDetailPage'
import { TeachersFormPage } from '@/pages/TeachersFormPage'
import { EnrollmentsListPage } from '@/pages/EnrollmentsListPage'
import { CoursesListPage } from '@/pages/CoursesListPage'
import { CoursesDetailPage } from '@/pages/CoursesDetailPage'
import { CoursesFormPage } from '@/pages/CoursesFormPage'
import { GradesListPage } from '@/pages/GradesListPage'
import { CertificatesListPage } from '@/pages/CertificatesListPage'
import { TcuListPage } from '@/pages/TcuListPage'
import { AttendanceListPage } from '@/pages/AttendanceListPage'
import { ReportsPage } from '@/pages/ReportsPage'
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
            <Route element={<RoleGate allow={['admin']} />}>
              <Route path="teachers" element={<TeachersListPage />} />
              <Route path="teachers/new" element={<TeachersFormPage />} />
              <Route path="teachers/:id" element={<TeachersDetailPage />} />
              <Route path="teachers/:id/edit" element={<TeachersFormPage />} />
              <Route path="enrollments" element={<EnrollmentsListPage />} />
            </Route>
            <Route element={<RoleGate allow={['admin', 'teacher', 'student']} />}>
              <Route path="courses" element={<CoursesListPage />} />
              <Route path="courses/:id" element={<CoursesDetailPage />} />
              <Route path="attendance" element={<AttendanceListPage />} />
            </Route>
            <Route element={<RoleGate allow={['admin']} />}>
              <Route path="courses/new" element={<CoursesFormPage />} />
              <Route path="courses/:id/edit" element={<CoursesFormPage />} />
              <Route path="grades" element={<GradesListPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RoleGate allow={['admin', 'student']} />}>
              <Route path="certificates" element={<CertificatesListPage />} />
            </Route>
            <Route element={<RoleGate allow={['admin', 'student', 'tcu']} />}>
              <Route path="tcu" element={<TcuListPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
