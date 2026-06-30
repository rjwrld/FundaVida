import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'
import { shortCourseName } from '../src/lib/courseName'

// Deterministic anchors from the seed (faker.seed(42)). The first emitted
// Certificate anchors a closed Course; its Teacher is therefore guaranteed an
// assigned Course with grades and an issued certificate — a populated profile.
const world = seedDemo(new Date())
const anchorCert = world.certificates[0]
if (!anchorCert) throw new Error('seed has no emitted certificate')
const anchorCourse = world.courses.find((c) => c.id === anchorCert.courseId)
if (!anchorCourse) throw new Error('seed: certificate course missing')
const anchorTeacher = world.teachers.find((t) => t.id === anchorCourse.teacherId)
if (!anchorTeacher) throw new Error('seed: course teacher missing')
const anchorTeacherName = `${anchorTeacher.firstName} ${anchorTeacher.lastName}`

test('admin sees a teacher profile with per-course stats (ADR-0012 scope seam)', async ({
  page,
}) => {
  await enterAs(page, 'admin')
  await page.goto(`/app/teachers/${anchorTeacher.id}`)

  // The header names the teacher, and the per-course table carries teacher-centric
  // stat columns — all read through the scope seam, never the raw store.
  await expect(page.getByRole('heading', { name: anchorTeacherName })).toBeVisible()
  for (const col of ['Course', 'Status', 'Term', 'Roster', 'Graded', 'Certificates']) {
    await expect(page.getByRole('columnheader', { name: col, exact: true })).toBeVisible()
  }
  // The closed anchor Course links to its detail and shows the Closed status.
  await expect(page.getByRole('link', { name: shortCourseName(anchorCourse) })).toBeVisible()
  await expect(page.getByText('Closed').first()).toBeVisible()
})

test('teacher profile renders its per-course table in Spanish', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.goto(`/app/teachers/${anchorTeacher.id}`)

  await expect(page.getByRole('heading', { name: anchorTeacherName })).toBeVisible()
  for (const col of ['Curso', 'Estado', 'Periodo', 'Matrícula', 'Calificados', 'Certificados']) {
    await expect(page.getByRole('columnheader', { name: col, exact: true })).toBeVisible()
  }
  await expect(page.getByText('Cerrado').first()).toBeVisible()
})

test('admin creates a teacher', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `E2E${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Teachers' }).click()
  await expect(page.getByRole('heading', { name: 'Teachers' })).toBeVisible()

  await page.getByRole('button', { name: 'Add teacher' }).click()
  await expect(page.getByRole('heading', { name: 'New teacher' })).toBeVisible()

  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Smith')
  await page.getByLabel('Email').fill(`e2e${suffix}@fv.cr`)
  await page.getByRole('combobox', { name: /campus/i }).click()
  await page.getByRole('option', { name: 'Linda Vista' }).click()
  // Province first, then canton (scoped to the province).
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()
  await page.getByRole('combobox', { name: /canton/i }).click()
  await page.getByRole('option', { name: 'Escazú' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  // The modal closes and the new teacher shows up in the list.
  await expect(page.getByRole('heading', { name: 'New teacher' })).toBeHidden()
  await expect(page.getByRole('link', { name: `${firstName} Smith` })).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Docentes' }).click()
  await expect(page.getByRole('heading', { name: 'Docentes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar docente' })).toBeVisible()
})
