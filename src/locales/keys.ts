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
t('students.form.level.Primary')
t('students.form.level.Secondary')
t('students.form.level.University')

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
t('auditLog.actions.create')
t('auditLog.actions.update')
t('auditLog.actions.delete')
t('auditLog.actions.enroll')
t('auditLog.actions.unenroll')
t('auditLog.actions.grade')

// Keys referenced dynamically via t(`auditLog.entities.${entry.entity}`)
t('auditLog.entities.student')
t('auditLog.entities.teacher')
t('auditLog.entities.course')
t('auditLog.entities.enrollment')
t('auditLog.entities.grade')
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
t('dashboard.admin.students')
t('dashboard.admin.teachers')
t('dashboard.admin.courses')
t('dashboard.admin.grades')
t('dashboard.teacher.myCourses')
t('dashboard.teacher.students')
t('dashboard.placeholder.cardTitle')
t('dashboard.placeholder.studentCopy')
t('dashboard.placeholder.tcuCopy')

// Keys referenced via LANDING_FEATURES[].titleKey/captionKey/altKey in FeaturePreview
t('landing.featurePreview.students.title')
t('landing.featurePreview.students.caption')
t('landing.featurePreview.students.alt')
t('landing.featurePreview.certificate.title')
t('landing.featurePreview.certificate.caption')
t('landing.featurePreview.certificate.alt')
t('landing.featurePreview.reports.title')
t('landing.featurePreview.reports.caption')
t('landing.featurePreview.reports.alt')
