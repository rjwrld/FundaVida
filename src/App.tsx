import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { RoleRequired } from '@/components/demo/RoleRequired'
import { RoleGate } from '@/components/demo/RoleGate'
import { coursesDetailRoute } from '@/pages/coursesDetailRoute'

// Every /app page is code-split into its own chunk (#353): the landing page is
// the entry surface and stays eager, while the heavy leaves (recharts on the
// dashboards, TanStack Table on the lists, react-day-picker on the calendar)
// load with the route that needs them. Pages export by name, so each lazy()
// re-plumbs the named export into the default React.lazy expects. The Suspense
// boundary lives in AppLayout's outlet (shell stays painted); the one around
// <Routes> below covers pages outside the shell.
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const CalendarPage = lazy(() =>
  import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage }))
)
const StudentsListPage = lazy(() =>
  import('@/pages/StudentsListPage').then((m) => ({ default: m.StudentsListPage }))
)
const StudentsDetailPage = lazy(() =>
  import('@/pages/StudentsDetailPage').then((m) => ({ default: m.StudentsDetailPage }))
)
const MeProfilePage = lazy(() =>
  import('@/pages/MeProfilePage').then((m) => ({ default: m.MeProfilePage }))
)
const TeachersListPage = lazy(() =>
  import('@/pages/TeachersListPage').then((m) => ({ default: m.TeachersListPage }))
)
const TeachersDetailPage = lazy(() =>
  import('@/pages/TeachersDetailPage').then((m) => ({ default: m.TeachersDetailPage }))
)
const EnrollmentsListPage = lazy(() =>
  import('@/pages/EnrollmentsListPage').then((m) => ({ default: m.EnrollmentsListPage }))
)
const CoursesListPage = lazy(() =>
  import('@/pages/CoursesListPage').then((m) => ({ default: m.CoursesListPage }))
)
const BrowseCoursesPage = lazy(() =>
  import('@/pages/BrowseCoursesPage').then((m) => ({ default: m.BrowseCoursesPage }))
)
const ProgramsListPage = lazy(() =>
  import('@/pages/ProgramsListPage').then((m) => ({ default: m.ProgramsListPage }))
)
const ProgramsDetailPage = lazy(() =>
  import('@/pages/ProgramsDetailPage').then((m) => ({ default: m.ProgramsDetailPage }))
)
const GradesListPage = lazy(() =>
  import('@/pages/GradesListPage').then((m) => ({ default: m.GradesListPage }))
)
const CertificatesListPage = lazy(() =>
  import('@/pages/CertificatesListPage').then((m) => ({ default: m.CertificatesListPage }))
)
const TcuListPage = lazy(() =>
  import('@/pages/TcuListPage').then((m) => ({ default: m.TcuListPage }))
)
const AttendanceListPage = lazy(() =>
  import('@/pages/AttendanceListPage').then((m) => ({ default: m.AttendanceListPage }))
)
const MarkSessionAttendancePage = lazy(() =>
  import('@/pages/MarkSessionAttendancePage').then((m) => ({
    default: m.MarkSessionAttendancePage,
  }))
)
const AuditLogPage = lazy(() =>
  import('@/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
)
const BulkEmailPage = lazy(() =>
  import('@/pages/BulkEmailPage').then((m) => ({ default: m.BulkEmailPage }))
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)

export function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={null}>
        <Routes>
          <Route index element={<LandingPage />} />
          <Route element={<RoleRequired />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              {/* The Student's own self-service profile (issue #166). Self-only is
                  structural — the page reads self-scoped seams and redirects any
                  non-Student role — so it needs no RoleGate, like the dashboard. */}
              <Route path="me" element={<MeProfilePage />} />
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
                {/* Preloadable rather than plain-lazy: the list warms this route on
                    hover so the detail page mounts without the extra suspended commit
                    `React.lazy` costs on its first render — the commit that would
                    otherwise cost the session's first Course its morph. */}
                <Route path="courses/:id" element={<coursesDetailRoute.Route />} />
              </Route>
              <Route element={<RoleGate resource="grades" />}>
                <Route path="grades" element={<GradesListPage />} />
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
                <Route
                  path="courses/:courseId/sessions/:sessionDate/mark"
                  element={<MarkSessionAttendancePage />}
                />
              </Route>
              <Route element={<RoleGate resource="tcu" />}>
                <Route path="tcu" element={<TcuListPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
