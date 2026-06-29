/**
 * Static key references for i18next-parser.
 * Keys used dynamically (e.g. t(item.labelKey)) must be listed here
 * so the parser can include them in the extracted dictionaries.
 * This file is never imported at runtime.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { t } = require('i18next') as { t: (key: string) => string }

// Keys referenced via t(`nav.sections.${group.section}`) in AppSidebar
t('nav.sections.programs')
t('nav.sections.people')
t('nav.sections.reports')

// Keys referenced via NAV_ITEMS[].labelKey in AppSidebar
t('nav.dashboard')
t('nav.calendar')
t('nav.programs')
t('nav.students')
t('nav.teachers')
t('nav.enrollments')
t('nav.courses')
t('nav.grades')
t('nav.attendance')
t('nav.reports')
t('nav.certificates')
t('nav.tcu')
t('nav.auditLog')
t('nav.bulkEmail')

// Keys referenced via ROLES[].labelKey and ROLES[].blurbKey in LandingPage and RoleSwitcher
t('roles.admin.label')
t('roles.admin.blurb')
t('roles.teacher.label')
t('roles.teacher.blurb')
t('roles.student.label')
t('roles.student.blurb')
t('roles.tcu.label')
t('roles.tcu.blurb')

// Keys declared in the dictionary skeleton for future tasks but not yet in use
t('common.actions.cancel')
t('common.actions.close')
t('common.actions.delete')
t('common.actions.save')
t('common.actions.backToHome')
t('notFound.title')
t('notFound.subtitle')

// Keys referenced dynamically via t(`students.form.gender.${value}`)
t('students.form.gender.F')
t('students.form.gender.M')
t('students.form.gender.X')

// Keys referenced dynamically via t(`students.form.level.${value}`)
t('students.form.level.primaria')
t('students.form.level.secundaria')

// Keys referenced dynamically via t(`students.form.guardian.relationship.${value}`)
t('students.form.guardian.relationship.madre')
t('students.form.guardian.relationship.padre')
t('students.form.guardian.relationship.tutor')
t('students.form.guardian.relationship.otro')

// Keys referenced dynamically via t(`courses.level.${level}`)
t('courses.level.primaria')
t('courses.level.secundaria')

// Keys referenced dynamically via t(`courses.status.${status}`)
t('courses.status.draft')
t('courses.status.published')

// Keys referenced via t('courses.list.columns.status') and t('courses.list.publishButton')
t('courses.list.columns.status')
t('courses.list.publishButton')

// Keys referenced dynamically via t(`attendance.list.status.${status}`)
t('attendance.list.status.present')
t('attendance.list.status.absent')
t('attendance.list.status.excused')

// Keys referenced dynamically via t(`certificates.status.${cert.status}`) in CertificateCard
t('certificates.status.approved')
t('certificates.status.pending')

// Keys declared in the dictionary skeleton for future tasks but not yet in use
t('validation.max')
t('validation.min')
t('validation.numberMax')
t('validation.numberMin')
t('validation.numberRequired')
t('validation.selectValue')

// --- Task 4 (Tier 3) dynamic key references ---

// Keys referenced dynamically via t(`auditLog.actions.${entry.action}`)
t('auditLog.actions.create')
t('auditLog.actions.update')
t('auditLog.actions.delete')
t('auditLog.actions.enroll')
t('auditLog.actions.unenroll')
t('auditLog.actions.grade')
t('auditLog.actions.approve')

// Keys referenced dynamically via t(`auditLog.entities.${entry.entity}`)
t('auditLog.entities.student')
t('auditLog.entities.teacher')
t('auditLog.entities.course')
t('auditLog.entities.enrollment')
t('auditLog.entities.grade')
t('auditLog.entities.certificate')
t('auditLog.entities.attendance')
t('auditLog.entities.tcu')
t('auditLog.entities.emailCampaign')

// Keys referenced dynamically via t(`auditLog.filter.${action}`) in the filter dropdown
t('auditLog.filter.create')
t('auditLog.filter.update')
t('auditLog.filter.delete')
t('auditLog.filter.enroll')
t('auditLog.filter.unenroll')
t('auditLog.filter.grade')
t('auditLog.filter.approve')

// Keys referenced dynamically via t(`bulkEmail.filter.${kind}`) for history rows
t('bulkEmail.filter.all')
t('bulkEmail.filter.program')
t('bulkEmail.filter.province')
t('bulkEmail.filter.course')

// Keys referenced dynamically via t(`bulkEmail.dimensions.${kind}`) for filter placeholder
t('bulkEmail.dimensions.program')
t('bulkEmail.dimensions.province')
t('bulkEmail.dimensions.course')

// DashboardPage passes literal-string keys via an array — declare them so the parser sees them
t('dashboard.teacher.myCourses')
t('dashboard.teacher.nextSession')
t('dashboard.teacher.nextSessions')
t('dashboard.teacher.noUpcomingSessions')
t('dashboard.teacher.markAttendance')
t('dashboard.teacher.endedCoursesAwaitingGrades')
t('dashboard.teacher.createCourseTitle')
t('dashboard.teacher.createCourseDescription')
t('dashboard.teacher.createCourseButton')
t('dashboard.student.myCourses')
t('dashboard.student.attendanceRate')
t('dashboard.student.nextClass')
t('dashboard.student.browseOpenCourses')
t('dashboard.student.browseDescription')
t('dashboard.tcu.hoursCompleted')
t('dashboard.tcu.hoursRemaining')
t('dashboard.tcu.recentActivities')
t('dashboard.tcu.recentActivitiesList')
t('dashboard.tcu.noActivities')
t('dashboard.topCourses.enrollmentCapacity')
t('dashboard.topCourses.capacityLabel')
// AdminDashboard recent-activity actor labels resolved via t(`dashboard.recentActivity.actor.${id}`)
t('dashboard.recentActivity.actor.admin')
t('dashboard.recentActivity.actor.system')

// Keys referenced dynamically via t(`landing.trustStrip.stat.${stat.key}`) in TrustStrip
t('landing.trustStrip.stat.modules')
t('landing.trustStrip.stat.locales')
t('landing.trustStrip.stat.tests')
t('landing.trustStrip.stat.backends')

// Mutation success toasts passed as `toastKey` to makeEntityMutation (resolved via
// t(config.toastKey) in the factory, so the parser can't see them at the call sites)
t('toasts.studentCreated')
t('toasts.studentUpdated')
t('toasts.studentDeleted')
t('toasts.teacherCreated')
t('toasts.teacherUpdated')
t('toasts.teacherDeleted')
t('toasts.courseCreated')
t('toasts.courseUpdated')
t('toasts.courseDeleted')
t('toasts.coursePublished')
t('toasts.enrolled')
t('toasts.unenrolled')
t('toasts.enrollmentRequested')
t('toasts.requestWithdrawn')
t('toasts.enrollmentApproved')
t('toasts.enrollmentRejected')
t('toasts.gradeSaved')
t('toasts.gradeDeleted')
t('toasts.campaignSent')
t('toasts.certificateApproved')
t('toasts.certificatesApproved')
t('toasts.tcuActivityLogged')
t('toasts.tcuActivityApproved')

// Keys referenced dynamically via t(`enrollments.status.${enrollment.status}`)
t('enrollments.status.approved')
t('enrollments.status.pending')
t('enrollments.status.rejected')
t('enrollments.status.withdrawn')

// Keys referenced dynamically via t(`enrollments.list.stats.${key}`)
t('enrollments.list.stats.pending')
t('enrollments.list.stats.approved')
t('enrollments.list.stats.sedes')
t('enrollments.list.stats.courses')

// Keys referenced dynamically via t(`enrollments.list.statusFilter.${value}`)
t('enrollments.list.statusFilter.active')
t('enrollments.list.statusFilter.all')
t('enrollments.list.statusFilter.pending')
t('enrollments.list.statusFilter.approved')
t('enrollments.list.statusFilter.rejected')
t('enrollments.list.statusFilter.withdrawn')
