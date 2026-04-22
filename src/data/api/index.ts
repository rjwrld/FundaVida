import { studentsApi } from './students'
import { coursesApi } from './courses'
import { teachersApi } from './teachers'
import { enrollmentsApi } from './enrollments'
import { gradesApi } from './grades'

export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
}
