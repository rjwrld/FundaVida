import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { StudentCertificatesSection } from '@/components/students/StudentCertificatesSection'
import { StudentGuardianCard, StudentIdentityCard } from '@/components/students/StudentProgress'
import { useCurrentStudent } from '@/hooks/api'
import { useStore } from '@/data/store'
import { fullName } from '@/lib/personName'

/**
 * The Student's own self-service profile (/app/me, issue #166): who they are —
 * Identity, Certificates, Guardian — read entirely through the self-scoped seams
 * (students:'self', certificates:'own'). Their per-Course progress already leads
 * the dashboard's My courses table, so it is not repeated here (ADR-0051). A
 * dedicated route — not the admin students/:id page — keeps self-only structural
 * (ADR-0008/0012): no Edit/Delete, and a non-Student role is sent back to their
 * dashboard. The page composes the shared panels rather than giving the detail
 * page's StudentProgress hub a `mode` prop (ADR-0032).
 */
export function MeProfilePage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const { data: student, isLoading } = useCurrentStudent()

  // Only a Student has a self-profile; any other role is redirected to their
  // dashboard. Branching on the synchronous role (not the async query) avoids a
  // flash of the loading state for admin/teacher/tcu.
  if (role && role !== 'student') return <Navigate to="/app" replace />

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>
  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('me.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={fullName(student)} description={student.email} />
      <StudentIdentityCard student={student} />
      <StudentCertificatesSection student={student} />
      <StudentGuardianCard student={student} />
    </div>
  )
}
