/**
 * Static key references for i18next-parser.
 * Keys used dynamically (e.g. t(item.labelKey)) must be listed here
 * so the parser can include them in the extracted dictionaries.
 * This file is never imported at runtime.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { t } = require('i18next') as { t: (key: string) => string }

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
t('common.language.english')
t('common.language.spanish')
t('demoBanner.reset')
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
t('courses.list.columns.enrolled')
t('enrollments.dialog.alreadyEnrolled')
t('students.detail.sections.location')
t('validation.max')
t('validation.min')
t('validation.numberMax')
t('validation.numberMin')
t('validation.numberRequired')
t('validation.selectValue')
