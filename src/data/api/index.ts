import { studentsApi } from './students'
import { coursesApi } from './courses'
import { programsApi } from './programs'
import { teachersApi } from './teachers'
import { traineesApi } from './trainees'
import { enrollmentsApi } from './enrollments'
import { gradesApi } from './grades'
import { certificatesApi } from './certificates'
import { tcuApi } from './tcu'
import { attendanceApi } from './attendance'
import { auditLogApi } from './auditLog'
import { emailCampaignsApi } from './emailCampaigns'

export const api = {
  students: studentsApi,
  courses: coursesApi,
  programs: programsApi,
  teachers: teachersApi,
  trainees: traineesApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
  certificates: certificatesApi,
  tcu: tcuApi,
  attendance: attendanceApi,
  auditLog: auditLogApi,
  emailCampaigns: emailCampaignsApi,
}
