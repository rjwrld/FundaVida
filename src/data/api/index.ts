import { studentsApi } from './students'
import { coursesApi } from './courses'
import { teachersApi } from './teachers'

export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
}
