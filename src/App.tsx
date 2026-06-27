import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppToaster } from '@/components/shared/AppToaster'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { StudentsListPage } from '@/pages/StudentsListPage'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
import { TeachersListPage } from '@/pages/TeachersListPage'
import { TeachersDetailPage } from '@/pages/TeachersDetailPage'
import { EnrollmentsListPage } from '@/pages/EnrollmentsListPage'
import { CoursesListPage } from '@/pages/CoursesListPage'
import { CoursesDetailPage } from '@/pages/CoursesDetailPage'
import { BrowseCoursesPage } from '@/pages/BrowseCoursesPage'
import { ProgramsListPage } from '@/pages/ProgramsListPage'
import { ProgramsDetailPage } from '@/pages/ProgramsDetailPage'
import { GradesListPage } from '@/pages/GradesListPage'
import { CertificatesListPage } from '@/pages/CertificatesListPage'
import { TcuListPage } from '@/pages/TcuListPage'
import { AttendanceListPage } from '@/pages/AttendanceListPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { AuditLogPage } from '@/pages/AuditLogPage'
import { BulkEmailPage } from '@/pages/BulkEmailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoleRequired } from '@/components/demo/RoleRequired'
import { RoleGate } from '@/components/demo/RoleGate'

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppToaster />
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route element={<RoleRequired />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            {/* Role-scoped by derived Sessions, not a permission, so it has no RoleGate (ADR-0013). */}
            <Route path="calendar" element={<CalendarPage />} />
            <Route element={<RoleGate resource="students" />}>
              <Route path="students" element={<StudentsListPage />} />
              <Route path="students/:id" element={<StudentsDetailPage />} />
            </Route>
            <Route element={<RoleGate resource="teachers" />}>
              <Route path="teachers" element={<TeachersListPage />} />
              <Route path="teachers/:id" element={<TeachersDetailPage />} />
            </Route>
            <Route element={<RoleGate resource="enrollments" />}>
              <Route path="enrollments" element={<EnrollmentsListPage />} />
            </Route>
            <Route element={<RoleGate resource="programs" />}>
              <Route path="programs" element={<ProgramsListPage />} />
              <Route path="programs/:id" element={<ProgramsDetailPage />} />
            </Route>
            <Route element={<RoleGate resource="courses" />}>
              <Route path="courses" element={<CoursesListPage />} />
              <Route path="courses/browse" element={<BrowseCoursesPage />} />
              <Route path="courses/:id" element={<CoursesDetailPage />} />
            </Route>
            <Route element={<RoleGate resource="grades" />}>
              <Route path="grades" element={<GradesListPage />} />
            </Route>
            <Route element={<RoleGate resource="reports" />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RoleGate resource="auditLog" />}>
              <Route path="audit-log" element={<AuditLogPage />} />
            </Route>
            <Route element={<RoleGate resource="bulkEmail" />}>
              <Route path="bulk-email" element={<BulkEmailPage />} />
            </Route>
            <Route element={<RoleGate resource="certificates" />}>
              <Route path="certificates" element={<CertificatesListPage />} />
            </Route>
            <Route element={<RoleGate resource="attendance" />}>
              <Route path="attendance" element={<AttendanceListPage />} />
            </Route>
            <Route element={<RoleGate resource="tcu" />}>
              <Route path="tcu" element={<TcuListPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
