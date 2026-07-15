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
t('nav.sections.account')

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
t('nav.certificates')
t('nav.tcu')
t('nav.auditLog')
t('nav.bulkEmail')
t('nav.myProfile')

// Keys referenced via ROLES[].labelKey and ROLES[].blurbKey in RoleSwitcher,
// and via t(`roles.${role}.label`) on the landing Hero's persona badges
t('roles.admin.label')
t('roles.admin.blurb')
t('roles.teacher.label')
t('roles.teacher.blurb')
t('roles.student.label')
t('roles.student.blurb')
t('roles.tcu.label')
t('roles.tcu.blurb')

// Keys referenced via t(`landing.badges.${role}.desc`) on the landing Hero
t('landing.badges.admin.desc')
t('landing.badges.teacher.desc')
t('landing.badges.student.desc')
t('landing.badges.tcu.desc')

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
t('courses.status.closed')

// Keys referenced dynamically via t(`courses.displayState.${state}`) in CourseStateBadge (ADR-0042)
t('courses.displayState.draft')
t('courses.displayState.startsSoon')
t('courses.displayState.inProgress')
t('courses.displayState.termEnded')
t('courses.displayState.finished')

// Keys referenced via t('courses.list.columns.status') and t('courses.list.publishButton')
t('courses.list.columns.status')
t('courses.list.publishButton')

// Keys referenced dynamically via t(`courses.form.weekdays.${day}`) — TcuDashboard,
// StudentCoursesTable and TeachersDetailPage all map over `meetingDays`. They reached the
// dictionaries only because CourseFormDialog happens to spell all seven out as literals;
// fold that block into a .map() and the parser would prune the family out from under the
// three consumers above (#329). One line per Weekday member.
t('courses.form.weekdays.mon')
t('courses.form.weekdays.tue')
t('courses.form.weekdays.wed')
t('courses.form.weekdays.thu')
t('courses.form.weekdays.fri')
t('courses.form.weekdays.sat')
t('courses.form.weekdays.sun')

// Keys referenced dynamically via t(`attendance.list.status.${status}`)
t('attendance.list.status.present')
t('attendance.list.status.absent')
t('attendance.list.status.excused')

// Keys declared in the dictionary skeleton for future tasks but not yet in use
t('validation.max')
t('validation.min')
t('validation.numberMax')
t('validation.numberMin')
t('validation.numberRequired')
t('validation.selectValue')

// --- Task 4 (Tier 3) dynamic key references ---

// Keys referenced dynamically via t(`auditLog.actions.${entry.action}`)
// One line per AuditAction member — the store emits all of them, and a member
// with no line here renders as its own raw key in the badge (#345).
t('auditLog.actions.create')
t('auditLog.actions.update')
t('auditLog.actions.delete')
t('auditLog.actions.enroll')
t('auditLog.actions.requestEnroll')
t('auditLog.actions.unenroll')
t('auditLog.actions.withdraw')
t('auditLog.actions.grade')
t('auditLog.actions.approve')
t('auditLog.actions.close')
t('auditLog.actions.log')

// Keys referenced dynamically via t(`auditLog.entities.${entry.entity}`)
// One line per AuditEntity member, same rule as the actions above. `tcuActivity`
// was misspelled `tcu` here, so it never matched the enum and rendered raw (#345).
t('auditLog.entities.student')
t('auditLog.entities.teacher')
t('auditLog.entities.course')
t('auditLog.entities.enrollment')
t('auditLog.entities.grade')
t('auditLog.entities.certificate')
t('auditLog.entities.attendance')
t('auditLog.entities.tcuActivity')
t('auditLog.entities.emailCampaign')
t('auditLog.entities.session')
t('auditLog.entities.announcement')

// Keys referenced dynamically via t(`auditLog.filter.${action}`) in the filter dropdown.
// A second namespace alongside auditLog.actions on purpose: the badge names the act
// ("Create"), the dropdown names the set of them ("Creates"). Needs one line per
// AuditAction too, or the dropdown option renders as its own raw key (#345).
t('auditLog.filter.create')
t('auditLog.filter.update')
t('auditLog.filter.delete')
t('auditLog.filter.enroll')
t('auditLog.filter.requestEnroll')
t('auditLog.filter.unenroll')
t('auditLog.filter.withdraw')
t('auditLog.filter.grade')
t('auditLog.filter.approve')
t('auditLog.filter.close')
t('auditLog.filter.log')

// Keys referenced dynamically via t(`bulkEmail.filter.${kind}`) for history rows
t('bulkEmail.filter.all')
t('bulkEmail.filter.program')
t('bulkEmail.filter.province')
t('bulkEmail.filter.course')

// Keys referenced dynamically via t(`bulkEmail.dimensions.${kind}`) for filter placeholder
t('bulkEmail.dimensions.program')
t('bulkEmail.dimensions.province')
t('bulkEmail.dimensions.course')

// Keys referenced dynamically via t(`bulkEmail.audience.${audience}`) — compose picker + history rows
t('bulkEmail.audience.students')
t('bulkEmail.audience.guardians')
t('bulkEmail.audience.both')

// Dashboard keys passed as literal strings — declare them so the parser sees them
t('dashboard.teacher.nextSessions')
t('dashboard.teacher.noUpcomingSessions')
t('dashboard.teacher.markAttendance')
t('dashboard.tcu.hoursCompleted')
t('dashboard.tcu.hoursRemaining')
t('dashboard.tcu.recentActivities')
t('dashboard.tcu.recentActivitiesList')
t('dashboard.tcu.noActivities')

// AtRiskStudents maps each reason to a label via t(REASON_KEY[reason])
t('dashboard.atRisk.reasonFailing')
t('dashboard.atRisk.reasonLowAttendance')

// Keys referenced dynamically via t(`tcu.list.status.${a.status}`) in TcuListPage
t('tcu.list.status.pending')
t('tcu.list.status.approved')
t('tcu.list.status.rejected')

// Keys referenced dynamically in the landing Q&A section (QASection): item copy
// via t(`landing.qa.items.${item.key}.*`) and stat labels via t(`landing.qa.stats.${stat.key}`)
t('landing.qa.items.backend.category')
t('landing.qa.items.backend.q')
t('landing.qa.items.backend.a')
t('landing.qa.items.data.category')
t('landing.qa.items.data.q')
t('landing.qa.items.data.a')
t('landing.qa.items.product.category')
t('landing.qa.items.product.q')
t('landing.qa.items.product.a')
t('landing.qa.items.product.delta')
t('landing.qa.items.bilingual.category')
t('landing.qa.items.bilingual.q')
t('landing.qa.items.bilingual.a')
t('landing.qa.items.break.category')
t('landing.qa.items.break.q')
t('landing.qa.items.break.a')
t('landing.qa.stats.modules')
t('landing.qa.stats.tests')
t('landing.qa.stats.locales')
t('landing.qa.stats.backends')

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
t('toasts.courseClosed')
t('toasts.enrolled')
t('toasts.unenrolled')
t('toasts.enrollmentRequested')
t('toasts.requestWithdrawn')
t('toasts.enrollmentApproved')
t('toasts.enrollmentRejected')
t('toasts.gradeSaved')
t('toasts.gradeDeleted')
t('toasts.campaignSent')
t('toasts.tcuActivityLogged')
t('toasts.tcuActivityApproved')
t('toasts.sessionAttendanceMarked')
t('toasts.sessionExceptionCreated')
t('toasts.announcementPosted')
t('toasts.announcementDeleted')

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

// Keys referenced dynamically via t(`calendar.month.milestones.${milestone.kind}`)
// in MonthMilestones — the month term map's row copy (ADR-0048)
t('calendar.month.milestones.cohortStart')
t('calendar.month.milestones.cohortEnd')
t('calendar.month.milestones.cancelled')
t('calendar.month.milestones.rescheduledFrom')
t('calendar.month.milestones.rescheduledTo')
